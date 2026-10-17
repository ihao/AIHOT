// One CNY ledger for all model attempts. Catalog estimates never represent a provider's bill.
import { sql, type Db } from '../db.ts';
import type { CallOutcome, ReceiptRequest } from './receipts.ts';

export class BudgetExceededError extends Error {
  readonly service: string;
  readonly retryAfterSeconds: number;
  constructor(service: string, window: string, retryAfterSeconds: number) {
    super(`Budget for ${service} exhausted (${window})`);
    this.service = service;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ModelCostBudgetError extends BudgetExceededError {
  readonly reason: string;
  constructor(reason: string, window = 'missing_bounds') {
    super('model_cost', window, 3600);
    this.reason=reason;
    this.message += `: 模型金额预算等待（${reason}）`;
  }
}

export interface ModelBudgetBounds {
  inputTokens: number;
  maxOutputTokens: number;
  bounded: boolean;
}
interface Price {
  service: string; model: string; currency: string;
  input_per_mtok: number; output_per_mtok: number; cached_per_mtok: number | null;
  per_request: number | null; verified_on: Date | string; source_url: string | null;
}
interface Policy {
  enabled: boolean; timezone: string; day_limit_cny: number; rolling_limit_cny: number; updated_at: Date;
}
export interface ModelCostReservation {
  amount: number; price: Price; bounds: ModelBudgetBounds;
}
const MODEL_SERVICES = ['llm','embedding','dashscope','deepseek','zhipu','mimo'];
const clearStatuses = [400,401,403,404,422,429];

export const isModelRequest = (req: Pick<ReceiptRequest,'service'|'model'|'modelBudget'>) =>
  !!req.model || !!req.modelBudget || MODEL_SERVICES.includes(req.service);

export async function lockModelCost(db: Db): Promise<void> {
  await db`SELECT pg_advisory_xact_lock(hashtext('budget:model-cost:global'))`;
}
async function policy(db: Db, lockForReservation=false): Promise<Policy> {
  // Operators use plain UPDATE, so the advisory money lock alone cannot prevent cap changes.
  const [row] = lockForReservation
    ? await db<Policy[]>`SELECT enabled,timezone,day_limit_cny,rolling_limit_cny,updated_at FROM model_cost_policy WHERE id=1 FOR SHARE`
    : await db<Policy[]>`SELECT enabled,timezone,day_limit_cny,rolling_limit_cny,updated_at FROM model_cost_policy WHERE id=1`;
  if (!row) throw new ModelCostBudgetError('金额策略记录缺失','missing_policy');
  return row;
}
export async function modelCostPolicyEnabled(db: Db = sql): Promise<boolean> {
  return (await policy(db)).enabled;
}
const nonnegative = (value: unknown): value is number => typeof value==='number' && Number.isFinite(value) && value>=0;
const tokens = (value: unknown): value is number => nonnegative(value) && Number.isSafeInteger(value);
const money = (n: number) => Math.ceil(n*1e9)/1e9;
const validBounds = (b: ModelBudgetBounds | null | undefined): b is ModelBudgetBounds =>
  !!b && b.bounded===true && tokens(b.inputTokens) && tokens(b.maxOutputTokens);

async function readPrice(db: Db, service: string, model: string | null, outputTokens: number): Promise<Price | null> {
  if (!model) return null;
  const [row] = await db<Price[]>`SELECT p.service,p.model,p.currency,p.input_per_mtok,p.output_per_mtok,p.cached_per_mtok,e.per_request,e.verified_on,e.source_url
    FROM service_prices p LEFT JOIN ninebtc_model_price_evidence e ON e.service=p.service AND e.model=p.model
    WHERE p.service=${service} AND p.model=${model}`;
  if (!row || row.currency!=='CNY' || !row.verified_on || !nonnegative(row.input_per_mtok)
    || (outputTokens>0 && !nonnegative(row.output_per_mtok))
    || (row.cached_per_mtok!==null && !nonnegative(row.cached_per_mtok))
    || (row.per_request!==null && !nonnegative(row.per_request))) return null;
  return {...row, output_per_mtok: row.output_per_mtok ?? 0};
}

function reserveAmount(price: Price, bounds: ModelBudgetBounds): number {
  return money((bounds.inputTokens*Math.max(price.input_per_mtok,price.cached_per_mtok??0)
    + bounds.maxOutputTokens*price.output_per_mtok)/1e6+(price.per_request??0));
}
function consistentTokens(values: unknown[]): number | null | undefined {
  if (!values.length) return undefined;
  if (!values.every(tokens) || values.some(value=>value!==values[0])) return null;
  return values[0] as number;
}
/** Shared by budget settlement and read-only reporting; conflicting aliases are never trusted. */
export function modelTokenUsage(usage: unknown, embedding=false): {input:number;output:number;cached:number} | null {
  if (!usage || typeof usage!=='object' || Array.isArray(usage)) return null;
  const u=usage as Record<string,unknown>;
  const aliases=(keys:string[])=>keys.filter(key=>Object.hasOwn(u,key)).map(key=>u[key]);
  const inputAlias=consistentTokens(aliases(['prompt_tokens','input_tokens']));
  const outputAlias=consistentTokens(aliases(['completion_tokens','output_tokens']));
  const cachedValues=aliases(['prompt_cache_hit_tokens','cached_tokens']);
  for(const field of ['prompt_tokens_details','input_tokens_details']) {
    if (!Object.hasOwn(u,field)) continue;
    const details=u[field];
    if (!details||typeof details!=='object'||Array.isArray(details))return null;
    if (Object.hasOwn(details,'cached_tokens')) cachedValues.push((details as Record<string,unknown>).cached_tokens);
  }
  const cachedAlias=consistentTokens(cachedValues);
  if(inputAlias===null||outputAlias===null||cachedAlias===null)return null;
  const input=inputAlias ?? (embedding ? u.total_tokens : undefined);
  const output=outputAlias ?? (embedding ? 0 : undefined);
  const cached=cachedAlias ?? 0;
  if (!tokens(input)||!tokens(output)||!tokens(cached)||cached>input) return null;
  if (Object.hasOwn(u,'total_tokens') && (!tokens(u.total_tokens)||u.total_tokens!==input+output)) return null;
  if (Object.hasOwn(u,'prompt_cache_miss_tokens') && (!tokens(u.prompt_cache_miss_tokens)||u.prompt_cache_miss_tokens!==input-cached))return null;
  return {input,output,cached};
}
function usageCost(usage: unknown, price: Price, embedding: boolean) {
  const parsed=modelTokenUsage(usage,embedding);
  if(!parsed)return null;
  const {input,output,cached}=parsed;
  return {input,output,amount:money(((input-cached)*price.input_per_mtok+cached*(price.cached_per_mtok??price.input_per_mtok)
    +output*price.output_per_mtok)/1e6+(price.per_request??0))};
}
/** Only these statuses, or a documented connection failure before sending, prove nonacceptance. */
export function definitelyNotAccepted(status: number | null): boolean {
  return status===null || clearStatuses.includes(status);
}
function legacyNotAccepted(error: string | null): boolean {
  return !!error && (/^(?:embeddings )?HTTP (400|401|403|404|422|429):/.test(error)
    || /^connect failed:/.test(error) || /^人工核对：供应商未计费。/.test(error));
}

interface WindowAmount {
  estimatedCny: number; reservedCny: number; totalCny: number; unpricedAttempts: number;
}
interface HistoricAttempt {
  id: number; service: string; model: string | null; started_at: Date; status: string; error: string | null;
  usage: unknown; cost: number | null; currency: string | null; cost_basis: string | null;
  model_cost_cny: number | null; model_cost_state: string | null; request: Record<string,unknown>;
}
const emptyWindow = (): WindowAmount => ({estimatedCny:0,reservedCny:0,totalCny:0,unpricedAttempts:0});

/** Read-only, including legacy attempts. Request-count usage_reset_at never affects either scope. */
async function costOverview(scope: 'all_models'|'verification_benchmark', now?: Date, db: Db=sql) {
  const p=await policy(db);
  const at=now ?? (await db<{at:Date}[]>`SELECT clock_timestamp() AS at`)[0]!.at;
  // PostgreSQL is microsecond-precise; Date truncates its clock read. Include that live millisecond.
  const until=now ? at : new Date(at.getTime()+1);
  const [time]=await db<{day_start:Date}[]>`SELECT date_trunc('day',${at}::timestamptz AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai' AS day_start`;
  const day=emptyWindow(),rolling=emptyWindow();
  const rows=await db<HistoricAttempt[]>`SELECT a.id,a.service,a.model,a.started_at,a.status,a.error,a.usage,a.cost,a.currency,a.cost_basis,
    a.model_cost_cny,a.model_cost_state,r.request FROM receipt_attempts a JOIN receipts r ON r.id=a.receipt_id
    WHERE a.origin='live' AND a.started_at>${new Date(at.getTime()-86400_000)} AND a.started_at<=${until}
      AND (${scope==='all_models'} OR r.purpose='verification_benchmark')
      -- The benchmark purpose remains authoritative even if legacy model/service metadata is absent.
      AND (r.purpose='verification_benchmark' OR a.model IS NOT NULL OR a.service IN ${db(MODEL_SERVICES)}) ORDER BY a.id`;
  const reasons:string[]=[];
  // Scoped to this view/transaction: no stale price or window survives into a later call.
  const prices=new Map<string,Price|null>();
  for(const row of rows) {
    let amount=row.model_cost_cny,estimated=row.model_cost_state==='estimated';
    if(amount===null) {
      if(row.usage===null && !(nonnegative(row.cost)&&row.cost>0) && legacyNotAccepted(row.error)) {amount=0;estimated=false;}
      else if(nonnegative(row.cost)&&row.currency==='CNY'&&row.cost_basis==='actual') {amount=row.cost;estimated=true;}
      else {
        const embedding=row.service==='embedding'||/^text-embedding/.test(row.model??'')||row.request?.count!==undefined;
        // Old userChars alone omits the system prompt, so it cannot safely reconstruct input tokens.
        const bound={inputTokens:Number(row.request?.inputTokenBound),maxOutputTokens:embedding?0:Number(row.request?.maxTokens),bounded:row.request?.modelBudgetBounded===true};
        const priceKey=JSON.stringify([row.service,row.model,!embedding]);
        if(!prices.has(priceKey))prices.set(priceKey,await readPrice(db,row.service,row.model,embedding?0:1));
        const price=prices.get(priceKey)??null;
        const used=price ? usageCost(row.usage,price,embedding) : null;
        if(used) {amount=used.amount;estimated=true;}
        else if(price&&validBounds(bound)) {amount=reserveAmount(price,bound);estimated=false;}
      }
    }
    for(const window of row.started_at>=time!.day_start?[rolling,day]:[rolling]) {
      if(amount===null||!nonnegative(amount)) {window.unpricedAttempts++;reasons.push(`历史尝试 ${row.id} 缺少可信用量、上界或 CNY 价格`);}
      else if(estimated) window.estimatedCny+=amount;
      else window.reservedCny+=amount;
    }
  }
  for(const window of [day,rolling]) {
    window.estimatedCny=Math.round(window.estimatedCny*1e9)/1e9;
    window.reservedCny=Math.round(window.reservedCny*1e9)/1e9;
    window.totalCny=Math.round((window.estimatedCny+window.reservedCny)*1e9)/1e9;
  }
  if(day.totalCny>=p.day_limit_cny)reasons.push('北京时间当日额度已用完');
  if(rolling.totalCny>=p.rolling_limit_cny)reasons.push('滚动 24 小时额度已用完');
  const enabled=scope==='verification_benchmark'||p.enabled;
  if(scope==='verification_benchmark'&&(!(p.day_limit_cny<=9)||!(p.rolling_limit_cny<=9)))reasons.push('评测实验自然日与滚动 24 小时限额必须均不超过 9 CNY');
  return {scope,scopeLabel:scope==='all_models'?'全站模型（含评测）':'独立评测实验',checkedAt:at.toISOString(),
    policy:{enabled,productionEnabled:p.enabled,updatedAt:p.updated_at.toISOString(),timezone:p.timezone,dayLimitCny:p.day_limit_cny,rollingLimitCny:p.rolling_limit_cny},
    day:{...day,startsAt:time!.day_start.toISOString()},rolling:{...rolling,startsAt:new Date(at.getTime()-86400_000).toISOString()},
    basis:'estimated' as const,blocked:enabled&&reasons.length>0,reasons:[...new Set(reasons)]};
}

/** Whole-site reporting remains available while its opt-in production cap is disabled. */
export function modelCostOverview(now?: Date, db: Db=sql) {return costOverview('all_models',now,db);}

/** All experiments share one independent window, regardless of dataset or the production toggle. */
export function benchmarkModelCostOverview(now?: Date, db: Db=sql) {return costOverview('verification_benchmark',now,db);}

/** Called under the global lock before the attempt row is created. */
export async function reserveModelCost(db: Db, req: ReceiptRequest): Promise<ModelCostReservation | null> {
  const benchmark=req.purpose==='verification_benchmark';
  if(!isModelRequest(req)&&!benchmark)return null;
  const p=await policy(db,true);
  // Only enabled controls ordinary production. Experiments always require their own bounded quota.
  if(benchmark&&(!(p.day_limit_cny<=9)||!(p.rolling_limit_cny<=9))) {
    throw new ModelCostBudgetError('评测实验的北京时间当日、滚动 24 小时上限均必须不超过 9 CNY','benchmark_policy');
  }
  const enforced=p.enabled||benchmark;
  // Disabling production admission keeps the ledger's original price and reliable bounds when available.
  if(!validBounds(req.modelBudget)) {
    if(!enforced)return null;
    throw new ModelCostBudgetError('请求没有可靠输入与输出 token 上界');
  }
  const price=await readPrice(db,req.service,req.model??null,req.modelBudget.maxOutputTokens);
  if(!price) {
    if(!enforced)return null;
    throw new ModelCostBudgetError('模型缺少经核对的 CNY 价格','missing_price');
  }
  const amount=reserveAmount(price,req.modelBudget);
  if(!nonnegative(amount)) {
    if(!enforced)return null;
    throw new ModelCostBudgetError('预占金额不可计算');
  }
  const check=(overview:Awaited<ReturnType<typeof costOverview>>,label:string)=>{
    if(overview.rolling.unpricedAttempts)throw new ModelCostBudgetError(`${label}：${overview.reasons[0]!}`,'unpriced_usage');
    if(overview.day.totalCny+amount>overview.policy.dayLimitCny)throw new ModelCostBudgetError(`${label}北京时间当日额度不足`,'amount_day');
    if(overview.rolling.totalCny+amount>overview.policy.rollingLimitCny)throw new ModelCostBudgetError(`${label}滚动 24 小时额度不足`,'amount_rolling');
  };
  if(benchmark)check(await benchmarkModelCostOverview(undefined,db),'评测实验');
  if(p.enabled)check(await modelCostOverview(undefined,db),'全站生产模型');
  return {amount,price,bounds:req.modelBudget};
}

/** Persist usage settlement under the same global lock as reservations. Bad usage retains the bound. */
export async function settleModelCost(db: Db, attemptId: number, outcome: CallOutcome) {
  const [row]=await db<{model_cost_reserved_cny:number|null;model_cost_price:Price|null;model_cost_bounds:ModelBudgetBounds|null;model:string|null;service:string}[]>`
    SELECT model_cost_reserved_cny,model_cost_price,model_cost_bounds,model,service FROM receipt_attempts WHERE id=${attemptId} FOR UPDATE`;
  if(!row?.model_cost_price||!row.model_cost_bounds||row.model_cost_reserved_cny===null)return null;
  const usage=usageCost(outcome.usage,row.model_cost_price,row.service==='embedding'||/^text-embedding/.test(row.model??''));
  const inBounds=usage&&usage.input<=row.model_cost_bounds.inputTokens&&usage.output<=row.model_cost_bounds.maxOutputTokens&&usage.amount<=row.model_cost_reserved_cny;
  const actual=outcome.cost?.basis==='actual'&&outcome.cost.currency==='CNY'&&nonnegative(outcome.cost.amount)?outcome.cost.amount:null;
  const actualOverrun=actual!==null&&actual>(usage?.amount??row.model_cost_reserved_cny);
  const amount=inBounds&&!actualOverrun?usage.amount:Math.max(row.model_cost_reserved_cny,usage?.amount??0,actual??0);
  const state=inBounds&&!actualOverrun?'estimated':'retained';
  const note=actualOverrun?'供应商 CNY 实扣高于目录估算，保留更高额度':inBounds?'目录 CNY 估算，非供应商实扣':usage?'usage 超出预占上界，保留更高额度':'usage 缺失或异常，保留预占';
  await db`UPDATE receipt_attempts SET model_cost_cny=${amount},model_cost_state=${state},model_cost_note=${note} WHERE id=${attemptId}`;
  return inBounds ? {amount,currency:'CNY',basis:'estimated' as const} : null;
}

export async function releaseModelCost(db: Db, receiptId: number, attemptId?: number): Promise<void> {
  // Explicitly confirmed free attempts are also annotated when they predate money-policy activation.
  await db`UPDATE receipt_attempts SET model_cost_cny=0,model_cost_state='released',model_cost_note='已明确确认供应商未接受或未计费'
    WHERE receipt_id=${receiptId} AND (${attemptId??null}::bigint IS NULL OR id=${attemptId??null})
      AND (status IN ('unknown','pending') OR id=${attemptId??null})`;
}
