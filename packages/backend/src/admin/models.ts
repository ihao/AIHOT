// Admin "模型与评测": the model each capability uses and where that choice comes from,
// the prompt versions in use, quality / latency / cost of the last days per model, the switch history
// and the SelectBench runs that compare models on the same batch. A switch is audited and applies to
// new work only.
import { sql } from "../db.ts";
import { CAPABILITIES, invalidateModelCache, modelSources, type Capability, type CapabilityKey } from "../editorial/models.ts";
import { MODELS } from "../providers/llm.ts";
import { audit } from "./auth.ts";
import { modelCostOverview,modelTokenUsage } from "../providers/model-cost.ts";
import { ORDINARY_VERIFICATION_MODEL,VERIFICATION_ROUTING_SETTING } from '../editorial/verification-execution.ts';

interface UsageRow {
  service: string;
  purpose: string;
  model: string | null;
  prompt_version: string | null;
  calls: number;
  ok: number;
  failed: number;
  unknown: number;
  p50: number | null;
  p95: number | null;
  token_usages: unknown[];
  actual_cost: string | null;
  currency: string | null;
}

export async function modelsOverview(days = 7) {
  const since = new Date(Date.now() - days * 86400_000);
  const [sources, usage, prices, history, benches, moneyBudget, routing] = await Promise.all([
    modelSources(),
    sql<UsageRow[]>`
      SELECT r.purpose, a.model, r.request->>'promptVersion' AS prompt_version, a.service, count(*)::int AS calls,
             count(*) FILTER (WHERE a.status = 'received')::int AS ok,
             count(*) FILTER (WHERE a.status = 'failed')::int AS failed,
             count(*) FILTER (WHERE a.status = 'unknown')::int AS unknown,
             percentile_disc(0.5) WITHIN GROUP (ORDER BY a.latency_ms) AS p50,
             percentile_disc(0.95) WITHIN GROUP (ORDER BY a.latency_ms) AS p95,
             jsonb_agg(a.usage) AS token_usages,
             sum(a.cost) FILTER (WHERE a.cost_basis = 'actual') AS actual_cost, max(a.currency) AS currency
      FROM receipt_attempts a JOIN receipts r ON r.id = a.receipt_id
      WHERE a.started_at >= ${since} AND a.origin = 'live' AND a.model IS NOT NULL
      GROUP BY 1, 2, 3, 4 ORDER BY 1, calls DESC`,
    sql<{ service: string; model: string; currency: string; input_per_mtok: string | null; output_per_mtok: string | null; cached_per_mtok: string | null }[]>`
      SELECT service, model, currency, input_per_mtok, output_per_mtok, cached_per_mtok FROM service_prices`,
    sql<{ at: Date; actor: string; subject: string; reason: string | null; before: unknown; after: unknown }[]>`
      SELECT created_at AS at, actor, subject, reason, before, after FROM audit_log WHERE action = 'models.switch' ORDER BY created_at DESC LIMIT 30`,
    sql<{ id: string; label: string; sample_size: number; prompt_version: string | null; models: string[]; summary: unknown; created_at: Date }[]>`
      SELECT id, label, sample_size, prompt_version, models,
             (SELECT coalesce(jsonb_object_agg(key, value - 'sweep'), '{}'::jsonb) FROM jsonb_each(r.summary)) AS summary,
      created_at FROM selectbench_runs r ORDER BY created_at DESC LIMIT 8`,
    modelCostOverview(),
    sql<{value:{enabled?:boolean;ordinaryModel?:string;datasetHash?:string;assessmentHash?:string}}[]>`SELECT value FROM settings WHERE key=${VERIFICATION_ROUTING_SETTING}`,
  ]);
  const tokenTotals=(u:UsageRow)=>u.token_usages.reduce<{input:number;output:number;cached:number;unknown:boolean}>((sum,raw)=>{
    if(raw===null)return sum;
    const trusted=modelTokenUsage(raw);
    if(trusted)return {input:sum.input+trusted.input,output:sum.output+trusted.output,cached:sum.cached+trusted.cached,unknown:sum.unknown};
    // Invalid cache aliases earn no discount. Invalid base usage has no trustworthy estimate.
    const value=raw as Record<string,unknown>;
    const count=(keys:string[])=>{
      const values=keys.filter(k=>Object.hasOwn(value,k)).map(k=>value[k]);
      return values.length&&values.every(n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n===values[0])?values[0] as number:null;
    };
    if(!value||typeof value!=='object'||Array.isArray(value))return {...sum,unknown:true};
    const input=count(['prompt_tokens','input_tokens']),output=count(['completion_tokens','output_tokens']);
    if(input===null||output===null||Object.hasOwn(value,'total_tokens')&&value.total_tokens!==input+output)return {...sum,unknown:true};
    return {...sum,input:sum.input+input,output:sum.output+output};
  },{input:0,output:0,cached:0,unknown:false});
  const priced = (u: UsageRow,tokens:ReturnType<typeof tokenTotals>) => {
    const service = u.service;
    const p = prices.find((x) => x.service === service && x.model === u.model) ?? prices.find((x) => x.service === service && x.model === "");
    if (tokens.unknown || !p || (!p.input_per_mtok && !p.output_per_mtok)) return null;
    return { amount: ((tokens.input-tokens.cached)*Number(p.input_per_mtok ?? 0)
      +tokens.cached*Number(p.cached_per_mtok ?? p.input_per_mtok ?? 0)+tokens.output*Number(p.output_per_mtok ?? 0))/1e6, currency: p.currency };
  };
  const capabilities = (Object.entries(CAPABILITIES) as Array<[CapabilityKey, Capability]>).map(([key, c]) => ({
    key,
    label: c.label,
    env: c.env,
    defaultModel: c.default,
    vision: !!c.vision,
    current: sources[key]!,
    usage: usage
      .filter((u) => c.purposes.includes(u.purpose))
      .map((u) => {const tokens=tokenTotals(u);return ({
        purpose: u.purpose,
        model: u.model,
        promptVersion: u.prompt_version,
        calls: u.calls,
        ok: u.ok,
        failed: u.failed,
        unknown: u.unknown,
        p50: u.p50,
        p95: u.p95,
        tokensIn: tokens.input,
        tokensOut: tokens.output,
        cachedTokensIn: tokens.cached,
        actualCost: u.actual_cost === null ? null : Number(u.actual_cost),
        currency: u.currency,
        estimate: priced(u,tokens),
      });}),
  }));
  const choices = Object.values(MODELS).map((m) => ({ key: m.key, service: m.service, vision: !!m.vision }));
  const ordinaryModel=routing[0]?.value.ordinaryModel??ORDINARY_VERIFICATION_MODEL;
  const verificationRouting = {enabled:routing[0]?.value.enabled===true&&ordinaryModel===ORDINARY_VERIFICATION_MODEL,ordinaryModel,datasetHash:routing[0]?.value.datasetHash??null,assessmentHash:routing[0]?.value.assessmentHash??null};
  return { days, capabilities, choices, history, benches, moneyBudget, verificationRouting };
}

/** Switches a capability to another registered model (or back to the environment/default when null). */
export async function switchModel(capability: string, model: string | null, reason: string, actor: string) {
  const c = (CAPABILITIES as Record<string, Capability>)[capability];
  if (!c) throw Object.assign(new Error("unknown capability"), { statusCode: 400 });
  if (!reason.trim()) throw Object.assign(new Error("a reason is required"), { statusCode: 400 });
  if (model !== null) {
    const spec = MODELS[model];
    if (!spec) throw Object.assign(new Error("unknown model"), { statusCode: 400 });
    if (!!c.vision !== !!spec.vision) throw Object.assign(new Error(c.vision ? "this capability needs a vision model" : "a vision-only model cannot do this"), { statusCode: 400 });
  }
  const before = (await modelSources())[capability];
  if (model === null) await sql`DELETE FROM settings WHERE key = ${`models.${capability}`}`;
  else {
    await sql`INSERT INTO settings (key, value, updated_by) VALUES (${`models.${capability}`}, ${sql.json({ model })}, ${actor})
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
  }
  invalidateModelCache();
  const after = (await modelSources())[capability];
  await audit(actor, "models.switch", `capability:${capability}`, reason, before ?? null, after ?? null);
  return { capability, before, after };
}
