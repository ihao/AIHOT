// Durable automatic fact gate. Model calls and evidence fetching happen outside transactions;
// article locks protect only snapshots, claims and grants. Recovery keeps the same stage receipt.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SELECTION } from '@aihot/industry/selection';
import { PRIMARY_EVIDENCE_HOSTS } from '@aihot/industry/evidence';
import { acceptedAutomaticRuleVersions } from '@aihot/industry/automatic-rule-compatibility';
import { load } from 'cheerio';
import { CATEGORY_KEYS } from '@aihot/contracts/taxonomy';
import { AutomaticSourcePaused, checkAutomaticSourcePause, refreshAutomaticSafety } from './automatic-safety.ts';
import { config } from '../config.ts';
import { automaticFreshnessReason } from '../content/freshness.ts';
import { sql, type Db, type Tx } from '../db.ts';
import { sha256, stableJson } from '../lib/ids.ts';
import { guardedFetch, type GuardedResponse } from '../lib/http-fetch.ts';
import { readable } from '../content/extract.ts';
import { chatJson, ModelOutputError, MODELS } from '../providers/llm.ts';
import { BudgetExceededError, ReceiptBusyError, completeReceipt, ReceiptUnknownError } from '../providers/receipts.ts';
import { modelFor } from './models.ts';
import { getReviewProposal } from './review.ts';
import { promptText, promptVersion } from './prompts.ts';
import { AUTOMATIC_POLICY_VERSION, VerificationSchema, evaluateAutomaticPublication, type VerificationMaterial } from './automatic-policy.ts';
import { enqueue, QUEUES } from '../jobs/queue.ts';
export const AUTOMATIC_AMOUNT_GUARD_VERSION = 'currency-amounts-v2';
export const AUTOMATIC_RULE_VERSION = `${AUTOMATIC_POLICY_VERSION}:${sha256(stableJson({
  amountGuard: AUTOMATIC_AMOUNT_GUARD_VERSION,
  selection: SELECTION,
  prefilter: promptVersion('prefilter'),
  score: promptVersion('selection-score'),
  understand: promptVersion('understand'),
  summarize: promptVersion('summarize-article', 'summarize-article-empty', 'summarize-short-post', 'summarize-short-post-quoted', 'summarize-long-post', 'summarize-long-post-quoted', 'identity-context'),
  structure: promptVersion('structure'),
  verification: promptVersion('verify-summary'),
  rewrite: promptVersion('rewrite-verified-summary')
})).slice(0, 24)}`;
export interface AutomaticCopy {
  titleZh: string | null;
  summaryZh: string | null;
  reasonZh: string | null;
  category: string | null;
}
interface Material extends VerificationMaterial {
  url: string;
}
interface Input {
  article_id: string;
  revision: number;
  title: string;
  body_text: string | null;
  body_html: string | null;
  body_status: string;
  url: string;
  source_id: string;
  first_party: boolean;
  source_enabled: boolean;
  participation_mode: string;
  auto_enabled: boolean | null;
  source_policy_version: number | null;
  analysis_id: number;
  relevance: string;
  category: string | null;
  title_zh: string | null;
  summary_zh: string | null;
  reason_zh: string | null;
  output: Record<string, unknown>;
}
interface Round {
  id: number;
  article_id: string;
  article_revision: number;
  analysis_id: number;
  automatic_rule_version: string;
  verification_model: string;
  verification_config_hash: string;
  original_fingerprint: string | null;
  final_fingerprint: string | null;
  evidence_links: string[];
  source_policy_version: number;
  final_copy_hash: string;
  original_copy_hash: string;
  original_copy: AutomaticCopy;
  final_copy: AutomaticCopy;
  materials: Material[];
  receipt_ids: number[];
  stage: 'initial' | 'evidence' | 'rewrite';
  evidence_fetched: boolean;
  rewritten: boolean;
  verification_count: number;
  status: string;
  selected: boolean;
  verification: unknown;
  decisions: unknown[];
  reasons: string[];
  failures: number;
  lease_token: string | null;
}
function verificationConfigHash(model: string): string {
  const spec = MODELS[model];
  return sha256(stableJson({
    model: spec?.model,
    service: spec?.service,
    extra: spec?.extra ?? null,
    jsonMode: spec?.jsonMode,
    system: promptText('verify-summary'),
    promptVersion: promptVersion('verify-summary'),
    temperature: 0,
    maxTokens: 16_384
  }));
}
export const automaticCopyHash = (copy: AutomaticCopy) => sha256(stableJson(copy));

/** Parameterized version checks also work before a connection has learned PostgreSQL array OIDs. */
function acceptedRuleCondition(roundAlias: string) {
  const round = sql(roundAlias);
  let previous = sql`false`;
  for (const version of acceptedAutomaticRuleVersions(AUTOMATIC_RULE_VERSION).slice(1)) {
    previous = sql`(${previous} OR ${round}.automatic_rule_version=${version})`;
  }
  return sql`(${round}.automatic_rule_version=${AUTOMATIC_RULE_VERSION} OR (${previous}
    AND NOT EXISTS(SELECT 1 FROM automatic_verifications current_rule
      WHERE current_rule.article_id=${round}.article_id AND current_rule.article_revision=${round}.article_revision
        AND current_rule.automatic_rule_version=${AUTOMATIC_RULE_VERSION})))`;
}

/** Read-time proof for a stored automatic grant; no asynchronous rebuild can substitute for it. */
export function automaticGrantCondition(publicationAlias: string, reviewAlias: string, requireSelected = false) {
  const p = sql(publicationAlias), er = sql(reviewAlias);
  return sql`EXISTS (
    SELECT 1 FROM automatic_verifications av JOIN articles a ON a.id=av.article_id
      JOIN analyses an ON an.id=av.analysis_id JOIN sources source ON source.id=a.source_id
      JOIN source_auto_public_policies sp ON sp.source_id=a.source_id
    WHERE av.article_id=${er}.article_id AND av.status='accepted' AND (NOT ${requireSelected} OR av.selected)
      AND av.article_revision=a.revision AND av.article_revision=${er}.article_revision
      AND av.analysis_id=${er}.analysis_id AND av.analysis_id=${p}.analysis_id
      AND av.analysis_id=(SELECT max(latest.id) FROM analyses latest WHERE latest.article_id=a.id AND latest.input_revision=a.revision)
      AND av.final_fingerprint=${er}.fingerprint AND ${acceptedRuleCondition('av')}
      AND source.enabled AND source.participation_mode='editorial' AND sp.enabled
      AND sp.version=av.source_policy_version AND sp.version=${er}.source_policy_version
      AND av.final_copy=jsonb_build_object('titleZh',an.title_zh,'summaryZh',an.summary_zh,'reasonZh',an.reason_zh,'category',an.category)
      AND ${p}.title=an.title_zh AND ${p}.summary=an.summary_zh AND ${p}.category=an.category
      AND ${p}.reason IS NOT DISTINCT FROM CASE WHEN ${p}.selected THEN an.reason_zh ELSE NULL END
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(av.materials) material WHERE material->>'id'='original'
        AND material->>'bodyText'=a.body_text AND material->>'url'=a.url AND (material->>'primary')::boolean=source.first_party)
      AND NOT EXISTS(SELECT 1 FROM editorial_overrides o WHERE o.article_id=a.id)
      AND NOT EXISTS(SELECT 1 FROM audit_log log WHERE log.subject='content:'||a.id AND log.action IN ('content.review','content.curation'))
  )`;
}

/** Manual approvals and the legacy manual lane keep their existing semantics. Automatic grants
 * stay bound to the current or explicitly compatible accepted rule even after switching modes. */
export function publicationAuthorityCondition(publicationAlias: string) {
  const p = sql(publicationAlias);
  return sql`(
    EXISTS(SELECT 1 FROM editorial_reviews authority WHERE authority.article_id=${p}.article_id AND authority.status='approved')
    OR (${config.editorialMode === 'manual'}
      AND NOT EXISTS(SELECT 1 FROM automatic_verifications history WHERE history.article_id=${p}.article_id)
      AND NOT EXISTS(SELECT 1 FROM editorial_reviews authority WHERE authority.article_id=${p}.article_id AND authority.reviewed_by='automatic-verification'))
    OR EXISTS(SELECT 1 FROM editorial_reviews authority WHERE authority.article_id=${p}.article_id
      AND authority.status='auto_public' AND ${automaticGrantCondition(publicationAlias, 'authority')})
  )`;
}

const copyOf = (a: Input): AutomaticCopy => ({
  titleZh: a.title_zh,
  summaryZh: a.summary_zh,
  reasonZh: a.reason_zh,
  category: a.category
});
async function loadInput(db: Db, id: string): Promise<Input | null> {
  const [a] = await db<Input[]>`SELECT a.id AS article_id,a.revision,a.title,a.url,a.body_text,a.body_html,a.body_status,
  s.id AS source_id,s.first_party,s.enabled AS source_enabled,s.participation_mode,
  sp.enabled AS auto_enabled,sp.version AS source_policy_version,
  an.id AS analysis_id,an.relevance,an.category,an.title_zh,an.summary_zh,an.reason_zh,an.output
  FROM articles a JOIN sources s ON s.id=a.source_id
  LEFT JOIN source_auto_public_policies sp ON sp.source_id=s.id
  JOIN LATERAL(SELECT * FROM analyses WHERE article_id=a.id AND input_revision=a.revision ORDER BY id DESC LIMIT 1) an ON true
  WHERE a.id=${id} AND a.processing_state='analyzed' AND an.origin='model'`;
  return a ?? null;
}
async function manuallyHeld(db: Db, id: string) {
  const [row] = await db`SELECT 1 WHERE EXISTS(SELECT 1 FROM editorial_overrides WHERE article_id=${id})
 OR EXISTS(SELECT 1 FROM audit_log WHERE subject=${`content:${id}`} AND action IN ('content.review','content.curation'))`;
  return !!row;
}
/** Caller evidence policy is derived from original text and taxonomy; the verifier cannot clear it. */
export function requiresPrimaryEvidence(a: {
  first_party: boolean;
  title: string;
  body_text: string | null;
  category: string | null;
  output: Record<string, unknown>;
}) {
  return !a.first_party && (['security', 'policy', 'regulation', 'governance'].includes(a.category ?? '') || /security|policy|regulat|governance|hack|exploit|attack|loss|enforcement/i.test(String(a.output.itemType ?? '')) || /\b(?:hack(?:ed|ing)?|exploit|attack|breach|loss(?:es)?|stolen|drain(?:ed)?|SEC|CFTC|regulat(?:ion|ory|or)|lawsuit|court|governance|proposal|vote|executed)\b|攻击|漏洞|被盗|损失|监管|起诉|法院|治理|提案|投票|执行/i.test(`${a.title}\n${a.body_text ?? ''}`));
}
export function approvedPrimaryUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && PRIMARY_EVIDENCE_HOSTS.some(d => u.hostname === d || u.hostname === `www.${d}`);
  } catch {
    return false;
  }
}
/** Only literal links in the fetched original body; model supplied links are never read. */
export function originalPrimaryLinks(bodyHtml: string | null, originalUrl: string): string[] {
  const urls: string[] = [];
  const $=load(bodyHtml ?? '');
  for (const anchor of $('a[href]').toArray()) {
    try {
      const url = new URL($(anchor).attr('href')!, originalUrl).toString();
      if (approvedPrimaryUrl(url) && !urls.includes(url)) urls.push(url);
    } catch {}
    if (urls.length === 2) break;
  }
  return urls;
}
export async function fetchPrimaryMaterial(url: string, fetcher: typeof guardedFetch = guardedFetch): Promise<Material | null> {
  if (!approvedPrimaryUrl(url)) return null;
  // Disable automatic redirects and validate every hop before any outbound request.
  let next = url;
  const deadline = Date.now() + 20_000;
  for (let hop = 0; hop <= 5; hop++) {
    if (!approvedPrimaryUrl(next) || Date.now() >= deadline) return null;
    const response: GuardedResponse = await fetcher(next, {
      timeoutMs: Math.max(1, deadline - Date.now()),
      maxBytes: 6 * 1024 * 1024,
      maxRedirects: 0,
      followRedirects: false
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      next = new URL(response.headers.get('location')!, next).toString();
      continue;
    }
    if (!approvedPrimaryUrl(response.url) || response.status !== 200 || !/(?:text\/html|application\/xhtml)/i.test(response.headers.get('content-type') ?? '')) return null;
    const body = readable(response.text(), response.url);
    return body ? {
      id: `primary:${sha256(response.url).slice(0, 20)}`,
      url: response.url,
      bodyText: body.text,
      primary: true
    } : null;
  }
  return null;
}
/** Persist once: a fresh analysis ID never resets a rejected/accepted round. */
export async function queueAutomaticVerificationTx(tx: Tx, articleId: string): Promise<void> {
  if (config.editorialMode !== 'automatic') return;
  if (await automaticFreshnessReason(articleId, tx)) return;
  const a = await loadInput(tx, articleId);
  if (!a || !a.source_enabled || !a.auto_enabled || a.participation_mode !== 'editorial') return;
  const copy = copyOf(a),
    hash = automaticCopyHash(copy);
  const proposal = await getReviewProposal(articleId, tx);
  const model = await modelFor("verification");
  const [round] = await tx<{
    id: number;
  }[]>`INSERT INTO automatic_verifications(article_id,article_revision,analysis_id,
 automatic_rule_version,verification_model,verification_config_hash,source_policy_version,original_fingerprint,final_fingerprint,original_copy_hash,final_copy_hash,original_copy,final_copy,materials)
 VALUES(${articleId},${a.revision},${a.analysis_id},${AUTOMATIC_RULE_VERSION},${model},${verificationConfigHash(model)},${a.source_policy_version ?? 0},${proposal?.fingerprint ?? null},${proposal?.fingerprint ?? null},${hash},${hash},
 ${tx.json(copy as never)},${tx.json(copy as never)},${tx.json([{
    id: 'original',
    url: a.url,
    bodyText: a.body_text ?? '',
    primary: a.first_party
  }] as never)})
 ON CONFLICT(article_id,article_revision,automatic_rule_version) DO NOTHING RETURNING id`;
  if (round) await enqueue(QUEUES.verifyAutomatic, {
    articleId
  }, {
    singletonKey: `automatic:${round.id}`
  }, tx);
}
function decision(a: Input, r: Round) {
  const scores = Array.isArray(a.output.scores) ? a.output.scores as number[] : [];
  try {
    const evaluated = evaluateAutomaticPublication({
      sourceAuthorized: a.auto_enabled === true,
      sourceEnabled: a.source_enabled && a.participation_mode === 'editorial',
      bodyReadable: a.body_status === 'ok' && !!a.body_text?.trim(),
      relevance: a.relevance,
      copy: copyOf(a),
      scores,
      threshold: typeof a.output.threshold === 'number' ? a.output.threshold : null,
      scoreRefused: a.output.scoreRefused === true,
      verification: r.verification,
      materials: r.materials,
      requiresPrimaryEvidence: requiresPrimaryEvidence(a)
    });
    const conflicts = deterministicCopyConflicts(copyOf(a), r.materials);
    return conflicts.length ? {
      ...evaluated,
      public: false,
      selected: false,
      reasons: [...evaluated.reasons, ...conflicts],
      verificationVerdict: "contradicted" as const
    } : evaluated;
  } catch {
    return {
      public: false,
      selected: false,
      reasons: ['scores_invalid'],
      verificationVerdict: 'needs_evidence' as const
    };
  }
}
/** Read-only exact accepted authority. It does not infer grants from legacy editorial rows. */
export async function currentAutomaticDecision(db: Db, articleId: string) {
  if (config.editorialMode !== 'automatic') return null;
  const a = await loadInput(db, articleId);
  if (!a || (await manuallyHeld(db, articleId))) return null;
  const [r] = await db<Round[]>`SELECT av.* FROM automatic_verifications av WHERE av.article_id=${articleId}
 AND av.article_revision=${a.revision} AND ${acceptedRuleCondition('av')} AND av.status='accepted'`;
  if (!r || r.analysis_id !== a.analysis_id || r.source_policy_version !== (a.source_policy_version ?? 0) || r.final_copy_hash !== automaticCopyHash(copyOf(a))) return null;
  const proposal = await getReviewProposal(articleId, db);
  if (!proposal || proposal.fingerprint !== r.final_fingerprint) return null;
  const d = decision(a, r);
  return d.public ? {
    ...d,
    verificationId: r.id,
    analysisId: a.analysis_id
  } : null;
}
const RewriteSchema = z.object({
  titleZh: z.string().trim().min(1).max(200),
  summaryZh: z.string().trim().min(1).max(4000),
  reasonZh: z.string().max(2000).nullable(),
  category: z.enum(CATEGORY_KEYS)
});

/** Count sent attempts from receipts even when a crash occurred before business persistence. */
async function verificationUsage(r: Round): Promise<{
  count: number;
  ids: number[];
}> {
  const prefix = `%:automatic:${r.id}:${r.automatic_rule_version}:analysis:${r.analysis_id}:%`;
  const [usage] = await sql<{
    count: number;
    ids: number[];
  }[]>`SELECT count(ra.id)::int AS count,
   coalesce(array_agg(DISTINCT receipts.id),'{}'::bigint[]) AS ids
   FROM receipt_attempts ra JOIN receipts ON receipts.id=ra.receipt_id
   WHERE receipts.purpose='verify_summary' AND receipts.logical_key LIKE ${prefix}`;
  return usage ?? {
    count: 0,
    ids: []
  };
}
const LEASE_MS = 10 * 60_000;
/** Claim/restart a stage using a durable lease; never hold a database lock while awaiting AI. */
export async function verifyAutomaticArticle(articleId: string, opts: {
  fetchMaterial?: (url: string) => Promise<Material | null>;
} = {}) {
  if (config.editorialMode !== 'automatic') return;
  const freshness = await automaticFreshnessReason(articleId);
  if (freshness) {
    await sql.begin(async tx=>{
      await tx`SELECT id FROM articles WHERE id=${articleId} FOR UPDATE`;
      const changed=await tx`UPDATE automatic_verifications SET status='rejected',reasons=${tx.json([`freshness:${freshness}`])},
        selected=false,lease_token=NULL,lease_until=NULL,retry_at=NULL,updated_at=now() WHERE article_id=${articleId}
        AND (status IN ('queued','waiting') OR (status='running' AND lease_until<now()))`;
      if(changed.count) {const {publishArticleTx}=await import('../publication/publish.ts');await publishArticleTx(tx,articleId);}
    });
    return;
  }
  try { await checkAutomaticSourcePause(articleId); }
  catch (error) {
    if (!(error instanceof AutomaticSourcePaused)) throw error;
    await sql`UPDATE automatic_verifications SET status='waiting',retry_at=${error.until},reasons='["source_paused"]',
      lease_token=NULL,lease_until=NULL WHERE article_id=${articleId} AND
      (status IN ('queued','waiting') OR (status='running' AND lease_until<now()))`;
    return;
  }
  const token = randomUUID();
  const claimed = await sql.begin(async tx => {
    await tx`SELECT id FROM articles WHERE id=${articleId} FOR UPDATE`;
    const a = await loadInput(tx, articleId);
    if (!a) return null;
    const [r] = await tx<Round[]>`UPDATE automatic_verifications SET status='running',lease_token=${token},lease_until=${new Date(Date.now() + LEASE_MS)},updated_at=now()
  WHERE article_id=${articleId} AND article_revision=${a.revision} AND automatic_rule_version=${AUTOMATIC_RULE_VERSION}
  AND (status IN ('queued','waiting') OR (status='running' AND lease_until<now()))
  AND (retry_at IS NULL OR retry_at<=now()) RETURNING *`;
    if (!r) return null;
    const proposal = await getReviewProposal(articleId, tx);
    if (!proposal || proposal.fingerprint !== r.final_fingerprint || r.verification_config_hash !== verificationConfigHash(r.verification_model) || r.analysis_id !== a.analysis_id || r.source_policy_version !== (a.source_policy_version ?? 0) || r.final_copy_hash !== automaticCopyHash(copyOf(a)) || (await manuallyHeld(tx, articleId))) {
      await tx`UPDATE automatic_verifications SET status='stale',selected=false,retry_at=NULL,reasons='["input_changed_or_manual_hold"]',lease_token=NULL,lease_until=NULL WHERE id=${r.id}`;
      const {publishArticleTx}=await import('../publication/publish.ts');
      await publishArticleTx(tx,articleId);
      return null;
    }
    return {
      a,
      r
    };
  });
  if (!claimed) return;
  let {
    a,
    r
  } = claimed;
  try {
    while (true) {
      await checkAutomaticSourcePause(articleId);
      const tag = `automatic:${r.id}:${r.automatic_rule_version}:analysis:${r.analysis_id}:${r.stage}`;
      if (r.stage === 'evidence' && !r.evidence_fetched) {
        for (const url of originalPrimaryLinks(a.body_html, a.url)) {
          if (r.evidence_links.includes(url)) continue;
          // Reserve the actual URL before the request: crash recovery must not fetch two pages again.
          const reserved = await sql`UPDATE automatic_verifications SET evidence_links=evidence_links||${sql.json([url])}::jsonb
       WHERE id=${r.id} AND lease_token=${token} AND jsonb_array_length(evidence_links)<2`;
          if (!reserved.count) return;
          r = {
            ...r,
            evidence_links: [...r.evidence_links, url]
          };
          try {
            const material = await (opts.fetchMaterial ?? fetchPrimaryMaterial)(url);
            if (material && approvedPrimaryUrl(material.url) && material.bodyText.trim()) {
              r = {
                ...r,
                materials: [...r.materials, {
                  ...material,
                  primary: true
                }]
              };
              await sql`UPDATE automatic_verifications SET materials=${sql.json(r.materials as never)},updated_at=now() WHERE id=${r.id} AND lease_token=${token}`;
            }
          } catch {/* failed evidence stays absent */}
        }
        r = {
          ...r,
          evidence_fetched: true
        };
        await sql`UPDATE automatic_verifications SET evidence_fetched=true,updated_at=now() WHERE id=${r.id} AND lease_token=${token}`;
        if (r.materials.length === 1) {
          await sql.begin(async tx=>{
            await tx`SELECT id FROM articles WHERE id=${articleId} FOR UPDATE`;
            const changed=await tx`UPDATE automatic_verifications SET status='rejected',selected=false,retry_at=NULL,
              reasons='["no_new_primary_evidence"]',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${r.id} AND lease_token=${token}`;
            if(changed.count) {const {publishArticleTx}=await import('../publication/publish.ts');await publishArticleTx(tx,articleId);}
          });
          return;
        }
      }
      if (r.stage === 'rewrite' && !r.rewritten) {
        await checkAutomaticSourcePause(articleId);
        const rewrite = await chatJson({
          model: await modelFor('understand'),
          purpose: 'rewrite_verified_summary',
          subject: `article:${articleId}@${a.revision}`,
          promptVersion: promptVersion('rewrite-verified-summary'),
          system: promptText('rewrite-verified-summary'),
          user: JSON.stringify({
            copy: r.final_copy,
            verification: r.verification,
            materials: r.materials
          }),
          schema: RewriteSchema,
          temperature: 0.2,
          maxTokens: 4096,
          attemptTag: `${tag}:rewrite`
        });
        const copy = rewrite.data,
          hash = automaticCopyHash(copy);
        const saved = await sql.begin(async tx => {
          await tx`SELECT id FROM articles WHERE id=${articleId} FOR UPDATE`;
          const current = await loadInput(tx, articleId);
          const before = await getReviewProposal(articleId, tx);
          if (!before || before.fingerprint !== r.final_fingerprint || !current || current.revision !== r.article_revision || current.analysis_id !== r.analysis_id || automaticCopyHash(copyOf(current)) !== r.final_copy_hash || (await manuallyHeld(tx, articleId))) return false;
          const updated = await tx`UPDATE automatic_verifications SET rewritten=true,final_copy=${tx.json(copy as never)},final_copy_hash=${hash},receipt_ids=array_append(receipt_ids,${rewrite.receiptId}),updated_at=now() WHERE id=${r.id} AND lease_token=${token}`;
          if (!updated.count) return false;
          await tx`UPDATE analyses SET title_zh=${copy.titleZh},summary_zh=${copy.summaryZh},reason_zh=${copy.reasonZh},category=${copy.category} WHERE id=${r.analysis_id}`;
          const after = await getReviewProposal(articleId, tx);
          if (!after) throw new Error("rewritten copy is not an approvable proposal");
          await tx`UPDATE automatic_verifications SET final_fingerprint=${after.fingerprint} WHERE id=${r.id} AND lease_token=${token}`;
          r = {
            ...r,
            final_fingerprint: after.fingerprint
          };
          await completeReceipt(tx, rewrite.receiptId);
          return true;
        });
        if (!saved) throw new Error('automatic input changed during rewrite');
        r = {
          ...r,
          rewritten: true,
          final_copy: copy,
          final_copy_hash: hash,
          receipt_ids: [...r.receipt_ids, rewrite.receiptId]
        };
        a = {
          ...a,
          title_zh: copy.titleZh,
          summary_zh: copy.summaryZh,
          reason_zh: copy.reasonZh,
          category: copy.category
        };
      }
      const usageBefore = await verificationUsage(r);
      const [settled] = await sql`SELECT 1 FROM receipts WHERE purpose='verify_summary'
     AND logical_key LIKE ${`%:${tag}`} AND status IN ('received','completed')`;
      if (usageBefore.count >= 3 && !settled) {
        await sql.begin(async tx=>{
          await tx`SELECT id FROM articles WHERE id=${articleId} FOR UPDATE`;
          const changed=await tx`UPDATE automatic_verifications SET status='rejected',selected=false,retry_at=NULL,
            verification_count=${Math.min(3,usageBefore.count)},receipt_ids=${usageBefore.ids},reasons='["verification_request_limit"]',
            lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${r.id} AND lease_token=${token}`;
          if(changed.count) {const {publishArticleTx}=await import('../publication/publish.ts');await publishArticleTx(tx,articleId);}
        });
        return;
      }
      await checkAutomaticSourcePause(articleId);
      const response = await chatJson({
        model: r.verification_model,
        purpose: 'verify_summary',
        subject: `article:${articleId}@${a.revision}`,
        promptVersion: promptVersion('verify-summary'),
        system: promptText('verify-summary'),
        user: JSON.stringify({
          copy: r.final_copy,
          requiresPrimaryEvidence: requiresPrimaryEvidence(a),
          materials: r.materials
        }),
        schema: VerificationSchema,
        temperature: 0,
        maxTokens: 16_384,
        attemptTag: tag
      });
      const usageAfter = await verificationUsage(r);
      r = {
        ...r,
        verification: response.data,
        verification_count: usageAfter.count,
        receipt_ids: [...new Set([...r.receipt_ids, ...usageAfter.ids])]
      };
      const d = decision(a, r);
      const nextStage = !d.public && d.verificationVerdict === 'needs_evidence' && !r.evidence_fetched ? 'evidence' : !d.public && d.verificationVerdict === 'contradicted' && !r.rewritten ? 'rewrite' : null;
      const terminal = d.public || !nextStage || r.verification_count >= 3;
      const saved = await sql.begin(async tx => {
        await tx`SELECT id FROM articles WHERE id=${articleId} FOR UPDATE`;
        const current = await loadInput(tx, articleId);
        const proposal = await getReviewProposal(articleId, tx);
        const currentInput = !!proposal && proposal.fingerprint === r.final_fingerprint && !!current && current.revision === r.article_revision && current.analysis_id === r.analysis_id && (current.source_policy_version ?? 0) === r.source_policy_version && automaticCopyHash(copyOf(current)) === r.final_copy_hash && !(await manuallyHeld(tx, articleId));
        const status = !currentInput ? 'stale' : terminal ? d.public ? 'accepted' : 'rejected' : 'running';
        const history = [...r.decisions, {
          stage: r.stage,
          verifier: response.data,
          decision: d,
          receiptId: response.receiptId
        }];
        const updated = await tx`UPDATE automatic_verifications SET verification=${tx.json(response.data as never)},verification_count=${r.verification_count},
     receipt_ids=${r.receipt_ids},reasons=${tx.json(d.reasons)},decisions=${tx.json(history as never)},selected=${currentInput && d.selected},status=${status},
     stage=${nextStage ?? r.stage},retry_at=NULL,lease_token=${terminal || !currentInput ? null : token},lease_until=${terminal || !currentInput ? null : new Date(Date.now() + LEASE_MS)},updated_at=now()
     WHERE id=${r.id} AND lease_token=${token}`;
        if (!updated.count) return false;
        await completeReceipt(tx, response.receiptId);
        if (terminal || !currentInput) {
          const {
            considerAutoPublicationTx
          } = await import('./auto-publication.ts');
          const {
            publishArticleTx
          } = await import('../publication/publish.ts');
          if (currentInput && d.public) await considerAutoPublicationTx(tx, articleId);
          await publishArticleTx(tx, articleId);
        }
        r = {
          ...r,
          decisions: history,
          stage: nextStage ?? r.stage,
          status
        };
        return currentInput;
      });
      if (terminal) await refreshAutomaticSafety();
      if (!saved || terminal) return;
    }
  } catch (error) {
    const waiting = error instanceof BudgetExceededError || error instanceof ReceiptBusyError || error instanceof AutomaticSourcePaused;
    const usage = await verificationUsage(r);
    const receiptId = error instanceof ModelOutputError || error instanceof ReceiptUnknownError ? error.receiptId : null;
    await sql.begin(async tx=>{
      await tx`SELECT id FROM articles WHERE id=${articleId} FOR UPDATE`;
      const [settled]=await tx`UPDATE automatic_verifications SET status=CASE WHEN ${usage.count >= 3} AND NOT ${waiting} THEN 'rejected' WHEN ${waiting} OR failures<2 THEN 'waiting' ELSE 'rejected' END,
   verification_count=${Math.min(3, usage.count)},
   selected=false,failures=failures+${waiting ? 0 : 1},retry_at=CASE WHEN ${waiting} OR (${usage.count < 3} AND failures<2)
     THEN ${error instanceof AutomaticSourcePaused ? error.until : new Date(Date.now() + (error instanceof BudgetExceededError ? error.retryAfterSeconds * 1000 : 60_000))} ELSE NULL END,
   reasons=${sql.json([String(error).slice(0, 1000)])},receipt_ids=${[...new Set([...r.receipt_ids, ...usage.ids, ...(receiptId === null ? [] : [receiptId])])]},
   lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${r.id} AND lease_token=${token} RETURNING status`;
      if(settled?.status==='rejected') {const {publishArticleTx}=await import('../publication/publish.ts');await publishArticleTx(tx,articleId);}
    });
    if (!(error instanceof AutomaticSourcePaused)) throw error;
  }
}
/** Restart recovery withdraws invalid grants and replays obsolete inputs without changing old rounds. */
export async function sweepAutomaticVerifications(): Promise<number> {
  if (config.editorialMode !== 'automatic') return 0;
  // Publish a removal before queuing recovery, so existing sync clients lose the old grant too.
  const { publishArticle } = await import('../publication/publish.ts');
  const invalid = await sql<{ id: string }[]>`SELECT p.article_id AS id FROM publications p
    WHERE (p.visibility<>'withdrawn' OR EXISTS(SELECT 1 FROM selected_state st WHERE st.article_id=p.article_id AND st.in_set))
      AND NOT ${publicationAuthorityCondition('p')} ORDER BY p.article_id`;
  for (const article of invalid) await publishArticle(article.id);
  // A new scoring/writing rule must re-enter normal analysis, whose step receipts decide reuse.
  // Never bind old scores to a new round, reset old counters, or overwrite terminal history.
  const obsolete = await sql<{ id: string }[]>`
    SELECT a.id FROM articles a JOIN sources s ON s.id=a.source_id
      JOIN source_auto_public_policies sp ON sp.source_id=s.id
      JOIN LATERAL (SELECT origin FROM analyses WHERE article_id=a.id AND input_revision=a.revision ORDER BY id DESC LIMIT 1) an ON true
    WHERE a.processing_state='analyzed' AND an.origin='model' AND s.enabled AND s.participation_mode='editorial' AND sp.enabled
      AND EXISTS(SELECT 1 FROM automatic_verifications old WHERE old.article_id=a.id AND old.automatic_rule_version<>${AUTOMATIC_RULE_VERSION})
      AND NOT EXISTS(SELECT 1 FROM automatic_verifications current WHERE current.article_id=a.id AND current.article_revision=a.revision AND current.automatic_rule_version=${AUTOMATIC_RULE_VERSION})
      AND NOT EXISTS(SELECT 1 FROM publications compatible JOIN editorial_reviews compatible_review
        ON compatible_review.article_id=compatible.article_id AND compatible_review.status='auto_public'
        WHERE compatible.article_id=a.id AND ${automaticGrantCondition('compatible', 'compatible_review')})
      AND NOT EXISTS(SELECT 1 FROM editorial_overrides o WHERE o.article_id=a.id)
      AND NOT EXISTS(SELECT 1 FROM audit_log log WHERE log.subject='content:'||a.id AND log.action IN ('content.review','content.curation'))
    ORDER BY a.id LIMIT 100`;
  const { queueProcessing } = await import('../jobs/content.ts');
  let recovered = 0;
  for (const article of obsolete) {
    await publishArticle(article.id);
    if (await queueProcessing(article.id, { step: 'analyze' })) recovered++;
  }
  const rows = await sql<{
    id: number;
    article_id: string;
  }[]>`SELECT id,article_id FROM automatic_verifications
 WHERE automatic_rule_version=${AUTOMATIC_RULE_VERSION}
 AND ((status IN ('queued','waiting') AND (retry_at IS NULL OR retry_at<=now())) OR (status='running' AND lease_until<now())) ORDER BY id LIMIT 100`;
  for (const r of rows) await enqueue(QUEUES.verifyAutomatic, {
    articleId: r.article_id
  }, {
    singletonKey: `automatic:${r.id}`
  });
  return recovered + rows.length;
}
function chineseAmount(text: string): number | null {
  const digits: Record<string, number> = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9
  };
  let total = 0,
    section = 0,
    current = 0;
  for (const char of text) {
    if (char in digits) {
      current = digits[char]!;
      continue;
    }
    const unit: Record<string, number> = {
      十: 10,
      百: 100,
      千: 1000,
      万: 10000,
      亿: 100000000
    };
    const value = unit[char];
    if (!value) return null;
    if (value >= 10000) {
      section += current;
      // 亿 scales the preceding 万 group too: 一万亿 = (一万) × 亿.
      // Lower 万 groups after 亿 still add to the accumulated higher group.
      total = value === 100000000 ? (total + section) * value : total + section * value;
      section = 0;
      current = 0;
    } else {
      section += (current || 1) * value;
      current = 0;
    }
  }
  return total + section + current;
}
function currencyAmounts(text: string): Array<{ currency: string; value: number }> {
  const values: Array<{ currency: string; value: number }> = [];
  // Read the whole mixed quantity, so “2千万” cannot fall through to the “千万” suffix.
  const quantity = '(?:[0-9][0-9,.]*(?:\\s*[十百千万亿]+)?|[零〇一二两三四五六七八九十百千万亿]+)';
  const add = (raw: string, currency: string, scale = '') => {
    const numeric = /^([0-9][0-9,.]*)\s*([十百千万亿]*)$/.exec(raw);
    const n = numeric ? Number(numeric[1]!.replace(/,/g, '')) * (numeric[2] ? chineseAmount(`一${numeric[2]}`) ?? NaN : 1) : chineseAmount(raw);
    const multiplier = ({ thousand: 1e3, k: 1e3, million: 1e6, m: 1e6, billion: 1e9, b: 1e9, trillion: 1e12, t: 1e12 } as Record<string, number>)[scale.toLowerCase()] ?? 1;
    if (n !== null && Number.isFinite(n)) values.push({ currency, value: n * multiplier });
  };
  const prefix = new RegExp(`((?:US\\s*)?\\$|人民币|RMB|CNY|￥)\\s*(${quantity})(?:\\s*(thousand|million|billion|trillion|[kmbt])(?![a-z0-9_]))?`, 'gi');
  for (const m of text.matchAll(prefix)) add(m[2]!, m[1]!.includes('$') ? 'USD' : 'CNY', m[3]);
  const suffix = new RegExp(`(?<![0-9零〇一二两三四五六七八九十百千万亿.,])(${quantity})\\s*(美元|USD(?![a-z0-9_])|US dollars(?![a-z0-9_])|人民币|元)`, 'gi');
  for (const m of text.matchAll(suffix)) add(m[1]!, /美元|USD|US dollars/i.test(m[2]!) ? 'USD' : 'CNY');
  return values;
}
/** Exact currency quantities must occur in fetched evidence, even when a verifier says true. */
export function deterministicCopyConflicts(copy: AutomaticCopy, materials: readonly VerificationMaterial[]): string[] {
  const original = materials.flatMap(m => currencyAmounts(m.bodyText));
  const claimed = currencyAmounts([copy.titleZh, copy.summaryZh, copy.reasonZh].filter(Boolean).join(' '));
  return claimed.some(n => !original.some(v => n.currency === v.currency && Math.abs(n.value - v.value) < 0.0001)) ? ['copy_amount_conflict'] : [];
}
