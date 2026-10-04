// Runs view: task timeline, queue backlog, source lag, error classes, process
// heartbeats, and the receipts and deliveries whose outcome needs an operator.
import { SELECTION } from '@aihot/industry/selection';
import { compatibleAcceptedCopy } from '@aihot/industry/automatic-rule-compatibility';
import { automaticReasonCode } from '@aihot/contracts/automatic-content';
import { AUTOMATIC_RULE_VERSION, automaticCopyHash, type AutomaticCopy } from '../editorial/automatic-verification.ts';
import { getReviewProposal } from '../editorial/review.ts';
import { freshnessReason } from '../content/freshness.ts';
import { listedCondition, selectedCondition } from '../publication/items.ts';
import { automaticSafetyStates } from "../editorial/automatic-safety.ts";
import { sql } from "../db.ts";
import { audit } from "./auth.ts";
import { Conflict } from "./sources.ts";
import { failureGroupSql, queueProcessing, requeueFailed } from "../jobs/content.ts";
import { isModelRequest, lockModelCost, modelCostOverview, modelCostPolicyEnabled, releaseModelCost } from '../providers/model-cost.ts';
export { modelCostOverview } from '../providers/model-cost.ts';

const STALE_HEARTBEAT_MS = 3 * 60_000;

interface StoredRound {
  id: number; article_id: string; article_revision: number; analysis_id: number; automatic_rule_version: string;
  status: string; source_policy_version: number; original_copy_hash: string; final_copy_hash: string;
  final_fingerprint: string | null; rewritten: boolean; reasons: string[]; decisions: Array<{ decision?: { reasons?: string[] }; evidenceFetch?: Array<{ reason: string }> }>;
}
interface CurrentArticle {
  id: string; revision: number; published_at: Date | null; tier: string; enabled: boolean; participation_mode: string;
  authorized: boolean; manually_held: boolean; policy_version: number; analysis_id: number | null; analysis_origin: string | null; processing_state: string; relevance: string | null;
  title_zh: string | null; summary_zh: string | null; reason_zh: string | null; category: string | null;
  output: Record<string, unknown> | null; actual_public: boolean; actual_selected: boolean; rounds: StoredRound[];
  analyses: Array<{ relevance: string | null; output: Record<string, unknown> | null; created_at: string }>;
}
const scoreQualified = (relevance: string | null, output: Record<string, unknown> | null, threshold: number | undefined) => {
  const scores = output?.scores;
  return relevance === 'pass' && threshold !== undefined && output?.scoreRefused !== true && Array.isArray(scores)
    && (scores.length === 2 || scores.length === 3) && scores.every(s => Number.isInteger(s) && s >= threshold && s <= 100)
    && Math.max(...scores) - Math.min(...scores) <= 20;
};
const countedReasons = (counts: Map<string, number>) => [...counts].map(([reason,n])=>({reason,n})).sort((a,b)=>b.n-a.n||a.reason.localeCompare(b.reason));

/** Unique current articles, independent from the historical verification-round totals below. */
async function currentArticleOverview(now: Date) {
  const [rows, selected] = await Promise.all([
    sql<CurrentArticle[]>`SELECT a.id,a.revision,a.published_at,a.processing_state,s.tier,s.enabled,s.participation_mode,
      coalesce(sp.enabled,false) AS authorized,coalesce(sp.version,0) AS policy_version,
      (EXISTS(SELECT 1 FROM editorial_overrides o WHERE o.article_id=a.id)
        OR EXISTS(SELECT 1 FROM audit_log log WHERE log.subject='content:'||a.id AND log.action IN ('content.review','content.curation'))) AS manually_held,
      an.id AS analysis_id,an.origin AS analysis_origin,an.relevance,an.title_zh,an.summary_zh,an.reason_zh,an.category,an.output,
      coalesce(p.eligible AND ${listedCondition(now)},false) AS actual_public,
      coalesce(p.eligible AND ${selectedCondition(now)},false) AS actual_selected,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',av.id,'article_id',av.article_id,'article_revision',av.article_revision,
        'analysis_id',av.analysis_id,'automatic_rule_version',av.automatic_rule_version,'status',av.status,
        'source_policy_version',av.source_policy_version,'original_copy_hash',av.original_copy_hash,'final_copy_hash',av.final_copy_hash,
        'final_fingerprint',av.final_fingerprint,'rewritten',av.rewritten,'reasons',av.reasons,'decisions',(SELECT coalesce(jsonb_agg(jsonb_build_object('evidenceFetch',entry->'evidenceFetch','decision',jsonb_build_object('reasons',entry->'decision'->'reasons'))),'[]')
          FROM jsonb_array_elements(av.decisions) entry WHERE entry ? 'evidenceFetch' OR entry->'decision' ? 'reasons')) ORDER BY av.id DESC)
        FROM automatic_verifications av WHERE av.article_id=a.id),'[]') AS rounds,
      coalesce((SELECT jsonb_agg(jsonb_build_object('relevance',history.relevance,'output',history.output,'created_at',history.created_at) ORDER BY history.id DESC)
        FROM analyses history WHERE history.article_id=a.id AND history.input_revision=a.revision),'[]') AS analyses
      FROM articles a JOIN sources s ON s.id=a.source_id
      LEFT JOIN source_auto_public_policies sp ON sp.source_id=s.id
      LEFT JOIN LATERAL(SELECT * FROM analyses WHERE article_id=a.id AND input_revision=a.revision ORDER BY id DESC LIMIT 1) an ON true
      LEFT JOIN publications p ON p.article_id=a.id
      WHERE a.discovered_at>${now}::timestamptz-interval '24 hours' AND a.discovered_at<=${now}`,
    sql<{ n: number }[]>`SELECT count(*)::int AS n FROM publications p
      WHERE p.eligible AND ${selectedCondition(now)} AND p.visible_after>${now}::timestamptz-interval '24 hours'`,
  ]);
  // Accepted status is current only while its complete immutable review target still matches.
  const proposals = new Map(await Promise.all(rows.filter(a=>a.rounds.some(r=>r.status==='accepted'
    &&r.article_revision===a.revision&&r.analysis_id===a.analysis_id&&compatibleAcceptedCopy(r,AUTOMATIC_RULE_VERSION)))
    .map(async a=>[a.id,await getReviewProposal(a.id)] as const)));
  const counts: Record<string,number> = {}, reasons = new Map<string,number>(), historicalReasons = new Map<string,number>();
  const diagnostics = new Map<string,number>(), historicalDiagnostics = new Map<string,number>();
  let passed=0, qualified=0, actualPublic=0, actualSelected=0, highScoreWaiting=0, oldestHighScoreAt: string|null=null;
  for(const a of rows) {
    const scoresPass=scoreQualified(a.relevance,a.output,SELECTION.thresholds[a.tier]);
    if(a.relevance==='pass')passed++;if(scoresPass)qualified++;
    if(a.actual_public)actualPublic++;if(a.actual_selected)actualSelected++;
    const copy: AutomaticCopy={titleZh:a.title_zh,summaryZh:a.summary_zh,reasonZh:a.reason_zh,category:a.category};
    const targetMatches=(r:StoredRound)=>r.article_revision===a.revision&&r.analysis_id===a.analysis_id&&r.source_policy_version===a.policy_version;
    const grantMatches=(r:StoredRound)=>targetMatches(r)&&!a.manually_held&&a.enabled&&a.authorized&&a.participation_mode==='editorial'
      &&r.final_copy_hash===automaticCopyHash(copy)&&compatibleAcceptedCopy(r,AUTOMATIC_RULE_VERSION)
      &&!!proposals.get(a.id)&&r.final_fingerprint===proposals.get(a.id)!.fingerprint;
    const exact=a.rounds.find(r=>r.article_revision===a.revision&&r.automatic_rule_version===AUTOMATIC_RULE_VERSION);
    const legacy=exact ? undefined : a.rounds.find(r=>r.status==='accepted'&&grantMatches(r));
    const round=exact??legacy??a.rounds[0];
    const isCurrent=!!round&&targetMatches(round)&&(round===exact||round===legacy)
      &&(round.status!=='accepted'||grantMatches(round));
    if(isCurrent)counts[round.status]=(counts[round.status]??0)+1;
    const currentReasons=new Set<string>(), oldReasons=new Set<string>(), currentDiagnostics=new Set<string>(), oldDiagnostics=new Set<string>();
    for(const saved of a.rounds) {
      const reasonSet=isCurrent&&saved===round?currentReasons:oldReasons;
      const diagnosticSet=isCurrent&&saved===round?currentDiagnostics:oldDiagnostics;
      for(const reason of saved.reasons)reasonSet.add(automaticReasonCode(reason));
      // Earlier verification failures remain useful even when recovery overwrites final reasons.
      for(const reason of [...saved.reasons,...saved.decisions.flatMap(entry=>entry.decision?.reasons??[])]) {
        if(/^claim_\d+_quote_invalid$/.test(reason))diagnosticSet.add('quote_invalid');
        if(reason==='primary_evidence_missing'||/^claim_\d+_primary_evidence_missing$/.test(reason))diagnosticSet.add('primary_evidence_unverified');
        if(reason==='body_unreadable'||reason==='original_unreadable')diagnosticSet.add('body_unreadable');
      }
      for(const entry of saved.decisions)for(const fetched of entry.evidenceFetch??[]) {
        if(['unsupported_entry','fetch_failed','identity_mismatch','pdf_unreadable','body_unreadable'].includes(fetched.reason))diagnosticSet.add(fetched.reason);
      }
    }
    for(const [set,map] of [[currentReasons,reasons],[oldReasons,historicalReasons],[currentDiagnostics,diagnostics],[oldDiagnostics,historicalDiagnostics]] as const)
      for(const reason of set)map.set(reason,(map.get(reason)??0)+1);
    if(scoresPass&&!a.manually_held&&a.analysis_origin==='model'&&a.processing_state==='analyzed'&&!a.actual_public&&a.enabled&&a.authorized&&a.participation_mode==='editorial'&&!freshnessReason(a.published_at,now)) {
      // Consecutive qualifying analyses form one episode; cached reanalysis cannot reset its age.
      let since:string|null=null;
      for(const history of a.analyses) {
        if(!scoreQualified(history.relevance,history.output,SELECTION.thresholds[a.tier]))break;
        since=history.created_at;
      }
      if(since&&now.getTime()-Date.parse(since)>=4*60*60_000) {
        highScoreWaiting++;if(!oldestHighScoreAt||Date.parse(since)<Date.parse(oldestHighScoreAt))oldestHighScoreAt=since;
      }
    }
  }
  const terminal=(counts.accepted??0)+(counts.rejected??0)+(counts.stale??0), selected24h=selected[0]?.n??0;
  return {collected:rows.length,passed,scoreQualified:qualified,public:actualPublic,selected:actualSelected,counts,
    acceptanceRate:terminal?(counts.accepted??0)/terminal:null,reasons:countedReasons(reasons),diagnostics:countedReasons(diagnostics),
    historicalReasons:countedReasons(historicalReasons),historicalDiagnostics:countedReasons(historicalDiagnostics),
    highScoreWaiting,oldestHighScoreAt,selected24h,selectionState:highScoreWaiting>0&&selected24h===0?'investigate':'normal'};
}

/** Stored decisions only. This view never retries a round or calls a model. */
export async function automaticVerificationOverview(now = new Date()) {
  const [statuses, reasons, recent, sourcePauses, issues] = await Promise.all([
    sql<{ status: string; n: number }[]>`SELECT status,count(*)::int AS n FROM automatic_verifications
      WHERE created_at>now()-interval '24 hours' GROUP BY status`,
    sql<{ reason: string; n: number }[]>`SELECT reason,count(*)::int AS n
      FROM automatic_verifications av CROSS JOIN LATERAL jsonb_array_elements_text(av.reasons) reason
      WHERE av.created_at>now()-interval '24 hours' GROUP BY reason ORDER BY n DESC,reason LIMIT 40`,
    sql<{ id: number; article_id: string; status: string; reasons: string[]; verification_count: number; receipt_ids: number[]; scores: number[] }[]>`
      SELECT av.id,av.article_id,av.article_revision,av.status,av.selected,av.verification->>'verdict' AS verdict,
        av.reasons,av.verification_count,av.failures,av.receipt_ids,av.updated_at,an.output->'scores' AS scores
      FROM automatic_verifications av JOIN analyses an ON an.id=av.analysis_id ORDER BY av.updated_at DESC,av.id DESC LIMIT 20`,
    automaticSafetyStates(),
    sql<{ failed: number; missing_evidence: number; disagreement: number }[]>`
      SELECT count(*) FILTER(WHERE av.failures>0)::int AS failed,
        count(*) FILTER(WHERE av.reasons ? 'verification_needs_evidence' OR av.reasons ? 'no_new_primary_evidence'
          OR av.reasons ? 'verification_missing_or_invalid' OR av.verification->>'verdict'='needs_evidence')::int AS missing_evidence,
        count(*) FILTER(WHERE (SELECT max(value::int)-min(value::int)>20 OR
          (min(value::int)<(an.output->>'threshold')::numeric AND max(value::int)>=(an.output->>'threshold')::numeric)
          FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(an.output->'scores')='array' THEN an.output->'scores' ELSE '[]'::jsonb END) value
          WHERE value ~ '^[0-9]{1,3}$'))::int AS disagreement
      FROM automatic_verifications av JOIN analyses an ON an.id=av.analysis_id WHERE av.created_at>now()-interval '24 hours'`,
  ]);
  const counts = Object.fromEntries(statuses.map(s => [s.status,s.n]));
  const terminal = (counts.accepted ?? 0)+(counts.rejected ?? 0)+(counts.stale ?? 0);
  return { current: await currentArticleOverview(now), counts, acceptanceRate: terminal ? (counts.accepted ?? 0)/terminal : null,
    failed: issues[0]?.failed ?? 0, missingEvidence: issues[0]?.missing_evidence ?? 0,
    disagreement: issues[0]?.disagreement ?? 0, reasons, recent, sourcePauses };
}

export async function runsOverview() {
  const [heartbeats, latest, timeline, queues, failedJobs, lagging, receipts, receiptIssues, deliveries, errors, ingest, leaderboard] = await Promise.all([
    sql<{ key: string; value: Record<string, unknown>; updated_at: Date }[]>`SELECT key, value, updated_at FROM settings WHERE key LIKE 'heartbeat.%' ORDER BY key`,
    sql`
      WITH latest AS (
        SELECT DISTINCT ON (job) job, started_at, finished_at, status, left(error, 400) AS error
        FROM job_runs ORDER BY job, started_at DESC
      ), counts AS (
        SELECT job, count(*) FILTER (WHERE status = 'failed')::int AS failed_24h, count(*)::int AS runs_24h
        FROM job_runs WHERE started_at > now() - interval '24 hours' GROUP BY job
      )
      SELECT latest.*, coalesce(counts.failed_24h, 0) AS failed_24h, coalesce(counts.runs_24h, 0) AS runs_24h
      FROM latest LEFT JOIN counts USING (job) ORDER BY job`,
    sql`SELECT id, job, started_at, finished_at, status, left(error, 300) AS error FROM job_runs ORDER BY started_at DESC LIMIT 80`,
    sql<{ name: string; state: string; n: number; oldest: Date }[]>`
      SELECT name, state, count(*)::int AS n, min(created_on) AS oldest FROM pgboss.job
      WHERE state IN ('created', 'retry', 'active') GROUP BY 1, 2 ORDER BY 1, 2`,
    sql`
      SELECT name, count(*)::int AS failed, max(completed_on) AS last, left((array_agg(output::text ORDER BY completed_on DESC))[1], 300) AS last_output
      FROM pgboss.job WHERE state = 'failed' AND completed_on > now() - interval '24 hours' GROUP BY 1 ORDER BY 2 DESC`,
    sql`
      SELECT id, name, kind, health, fail_count, last_ok_at, last_fetch_at, next_fetch_at, interval_minutes, left(last_error, 200) AS last_error
      FROM sources
      WHERE enabled AND kind NOT IN ('mp_account', 'external')
        AND (health = 'failing' OR next_fetch_at < now() - interval '30 minutes' OR last_ok_at < now() - make_interval(mins => greatest(interval_minutes * 6, 360)))
      ORDER BY health = 'failing' DESC, next_fetch_at LIMIT 60`,
    sql<{ status: string; n: number }[]>`SELECT status, count(*)::int AS n FROM receipts WHERE created_at > now() - interval '7 days' GROUP BY 1`,
    sql`
      SELECT id, service, model, purpose, subject, status, attempts, left(error, 240) AS error, created_at, updated_at FROM receipts
      WHERE status = 'unknown' OR (status = 'failed' AND updated_at > now() - interval '3 days') OR (status = 'pending' AND updated_at < now() - interval '15 minutes')
      ORDER BY status = 'unknown' DESC, updated_at DESC LIMIT 40`,
    sql`
      SELECT id, target_key, subject_kind, subject_id, status, attempts, left(response, 240) AS response, created_at, updated_at FROM deliveries
      WHERE status IN ('unknown', 'failed') OR (status = 'sending' AND updated_at < now() - interval '15 minutes')
      ORDER BY status = 'unknown' DESC, updated_at DESC LIMIT 40`,
    sql`
      SELECT ${failureGroupSql()} AS error, count(*)::int AS n, max(discovered_at) AS last,
             (array_agg(id ORDER BY discovered_at DESC))[1] AS example
      FROM articles WHERE processing_state = 'failed' AND discovered_at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 20`,
    sql`SELECT client, kind, status, left(error, 200) AS error, summary, created_at FROM ingest_events ORDER BY created_at DESC LIMIT 20`,
    sql<{ value: { at: string; sources: Record<string, { ok: boolean; at: string; lastOkAt: string | null; changed?: boolean; rows?: number; error?: string }> } }[]>`
      SELECT value FROM settings WHERE key = 'leaderboard.fetch'`,
  ]);
  // Articles waiting to retry after a passing provider problem (they are not failed).
  const [retrying] = await sql<{ n: number; next: Date | null }[]>`
    SELECT count(*)::int AS n, min(processing_retry_at) AS next FROM articles WHERE processing_state = 'new' AND processing_attempts > 0`;
  const now = Date.now();
  return {
    checkedAt: new Date(now).toISOString(),
    automatic: await automaticVerificationOverview(),
    modelCost: await modelCostOverview(),
    processes: heartbeats.map((h) => ({
      role: h.key.slice("heartbeat.".length),
      ...h.value,
      at: h.updated_at,
      alive: now - h.updated_at.getTime() < STALE_HEARTBEAT_MS,
    })),
    jobs: latest,
    timeline,
    queues,
    failedJobs,
    lagging,
    receipts: { counts: Object.fromEntries(receipts.map((r) => [r.status, r.n])), issues: receiptIssues },
    deliveries,
    errors,
    retrying: { count: retrying?.n ?? 0, next: retrying?.next ?? null },
    ingest,
    leaderboard: leaderboard[0]
      ? { at: leaderboard[0].value.at, sources: Object.entries(leaderboard[0].value.sources).map(([key, v]) => ({ key, ...v })).sort((a, b) => Number(a.ok) - Number(b.ok) || a.key.localeCompare(b.key)) }
      : null,
  };
}

const ANALYSIS_PURPOSES = ['analyze_article', 'prefilter_article', 'score_article', 'structure_article', 'understand_article', 'summarize_article'];

async function requeueReleasedAnalysis(id: number, purpose: string, subject: string | null) {
  const article = ANALYSIS_PURPOSES.includes(purpose) ? /^article:([^@]+)@/.exec(subject ?? '')?.[1] : undefined;
  if (!article) return false;
  const [row] = await sql`UPDATE articles SET processing_state='new',processing_attempts=0,processing_retry_at=NULL,processing_error=NULL
    WHERE id=${article} AND processing_state='failed' AND processing_error=${`receipt ${id} outcome unknown`} RETURNING id`;
  return !!row && !!(await queueProcessing(article, { step: 'analyze' }));
}

/**
 * A receipt whose outcome is unknown is not re-sent by the request that lost it. Releasing it marks it
 * failed, so the next attempt calls again; an article that stopped on it goes straight back to
 * processing (one action, not two). Only an unknown receipt is released, once.
 */
async function release(id: number, error: string, actor: string, note: string, billed: boolean | null) {
  const before = await sql.begin(async tx=>{
    await lockModelCost(tx);
    const [row] = await tx<{subject:string|null;purpose:string;service:string;model:string|null}[]>`SELECT subject,purpose,service,model FROM receipts WHERE id=${id} AND status='unknown' FOR UPDATE`;
    if (!row) return null;
    if (billed===null && isModelRequest(row) && await modelCostPolicyEnabled(tx)) return null;
    if (billed===false) await releaseModelCost(tx,id);
    await tx`
    UPDATE receipts SET status = 'failed', error = ${error}, updated_at = now() WHERE id = ${id} AND status = 'unknown' RETURNING subject, purpose`;
    await tx`UPDATE receipt_attempts SET status = 'failed', error = ${error} WHERE receipt_id = ${id} AND status = 'unknown'`;
    return row;
  });
  if (!before) return null;
  const requeued = await requeueReleasedAnalysis(id, before.purpose, before.subject);
  await audit(actor, "receipt.release", `receipt:${id}`, note, { status: "unknown" }, { status: "failed", billed, requeued });
  return { id, status: "failed", subject: before.subject, purpose: before.purpose, requeued };
}

/** Admin, after checking the provider's console: records whether it was billed and releases it. */
export async function releaseReceipt(id: number, input: { billed: boolean; note: string }, actor: string) {
  if (!input.note?.trim()) throw new Error("note is required");
  if (typeof input.billed!=='boolean') throw new Error('必须明确确认供应商是否计费');
  const [row] = await sql<{ status: string }[]>`SELECT status FROM receipts WHERE id = ${id}`;
  if (!row) return null;
  if (row.status !== "unknown") throw new Conflict("只有结果未知的回执需要人工核对");
  const error = `人工核对：${input.billed ? "供应商已计费但结果未取回" : "供应商未计费"}。${input.note}`;
  return release(id, error, actor, input.note, input.billed);
}

const AUTO_RELEASE_AFTER_MS = 30 * 60_000;
const AUTO_RELEASE_NOTE = "自动放行：结果未知超过 30 分钟，未核对是否计费";

/**
 * Every 10 minutes (ops.recover): unknown receipts older than half an hour are released
 * without checking the provider's bill. A lost answer costs at most one repeat: a request released this
 * way once and unknown again stays for the admin (the daily ops digest lists it).
 */
export async function autoReleaseUnknownReceipts(now = Date.now()) {
  const moneyEnabled = await modelCostPolicyEnabled();
  const rows = await sql<{ id: number }[]>`
    SELECT r.id FROM receipts r
    WHERE r.status = 'unknown' AND r.updated_at < ${new Date(now - AUTO_RELEASE_AFTER_MS)}
      AND (NOT ${moneyEnabled} OR (r.model IS NULL AND r.service NOT IN ('llm','embedding','dashscope','deepseek','zhipu','mimo')))
      AND NOT EXISTS (SELECT 1 FROM receipt_attempts a WHERE a.receipt_id = r.id AND a.error LIKE ${AUTO_RELEASE_NOTE + "%"})
    ORDER BY r.id LIMIT 200`;
  let released = 0;
  let requeued = 0;
  for (const r of rows) {
    const done = await release(r.id, AUTO_RELEASE_NOTE, "ops.recover", "结果未知，自动放行一次", null);
    if (done) released += 1;
    if (done?.requeued) requeued += 1;
  }
  // A crash or the old purpose mapping may have released the receipt without resuming its article.
  const stranded = await sql<{ id: number; purpose: string; subject: string | null }[]>`
    SELECT r.id,r.purpose,r.subject FROM receipts r JOIN articles a ON a.id=substring(r.subject FROM '^article:([^@]+)@')
    WHERE r.status='failed' AND r.purpose IN ${sql(ANALYSIS_PURPOSES)} AND r.error LIKE ${AUTO_RELEASE_NOTE + '%'}
      AND (NOT ${moneyEnabled} OR (r.model IS NULL AND r.service NOT IN ('llm','embedding','dashscope','deepseek','zhipu','mimo')))
      AND a.processing_state='failed' AND a.processing_error='receipt '||r.id||' outcome unknown'
    ORDER BY r.id LIMIT 200`;
  for (const r of stranded) {
    if (await requeueReleasedAnalysis(r.id, r.purpose, r.subject)) {
      requeued++;
      await audit('ops.recover', 'receipt.requeue_after_release', `receipt:${r.id}`, '已按原有一次规则释放的回执，恢复遗漏的分析排队',
        { status: 'failed', requeued: false }, { status: 'failed', requeued: true, billed: null });
    }
  }
  return { released, requeued };
}

/** Failed articles (one failure group, or all of the last 30 days) back into processing. */
export async function requeueFailedArticles(input: { group: string | null; reason: string }, actor: string) {
  if (!input.reason?.trim()) throw new Error("reason is required");
  const result = await requeueFailed(input.group);
  await audit(actor, "processing.requeue", input.group ? `failure:${input.group.slice(0, 80)}` : "failure:all", input.reason, null, result);
  return result;
}

/** An in-doubt delivery: confirmed as arrived, given up, or sent again after checking the group. */
export async function resolveDelivery(id: number, input: { outcome: "sent" | "drop" | "resend"; note: string }, actor: string) {
  if (!input.note?.trim()) throw new Error("note is required");
  const [before] = await sql<{ status: string }[]>`SELECT status FROM deliveries WHERE id = ${id}`;
  if (!before) return null;
  if (before.status !== "unknown" && before.status !== "failed") throw new Conflict("这条投递不需要处理");
  let status: string;
  if (input.outcome === "sent") {
    await sql`UPDATE deliveries SET status = 'sent', sent_at = coalesce(sent_at, now()), response = ${`人工确认已送达：${input.note}`}, updated_at = now() WHERE id = ${id}`;
    status = "sent";
  } else if (input.outcome === "drop") {
    await sql`UPDATE deliveries SET status = 'failed', response = ${`人工放弃：${input.note}`}, updated_at = now() WHERE id = ${id}`;
    status = "failed";
  } else {
    const { resendDelivery } = await import("../notify/deliver.ts");
    status = (await resendDelivery(id)).status;
  }
  await audit(actor, `delivery.${input.outcome}`, `delivery:${id}`, input.note, { status: before.status }, { status });
  return { id, status };
}
