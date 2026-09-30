// Exact content proposals for 9BTC's closed-by-default editorial gate.
// This module does not make a publication public: approval and projection are one
// transaction in the next implementation slice.
import { createHash } from "node:crypto";
import { sql, type Db, type Tx } from "../db.ts";
import { withLockedSourceArticles } from "./source-lock.ts";

export const EDITORIAL_POLICY_VERSION = "9btc-web3-v1";

export interface ReviewProposal {
  articleId: string;
  articleRevision: number;
  analysisId: number;
  overrideVersion: number;
  sourcePolicyVersion: number;
  fingerprint: string;
}

export interface EffectiveReview {
  proposal: ReviewProposal | null;
  status: "pending" | "approved" | "rejected" | "auto_public";
  curated: boolean;
  version: number;
}

type ProposalRow = {
  article: Record<string, unknown>;
  source: Record<string, unknown>;
  analysis: Record<string, unknown>;
  translation: Record<string, unknown> | null;
  quote_translation: Record<string, unknown> | null;
  override_data: Record<string, unknown> | null;
  source_policy_version: number | null;
};

/** Stable JSON used only as a hash input; a JSONB key-order change must not revoke approval. */
function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, part]) => [key, canonical(part)]));
  }
  return value;
}

export function fingerprintReviewTarget(target: {
  article: Record<string, unknown>;
  source: Record<string, unknown>;
  analysis: Record<string, unknown>;
  translation: Record<string, unknown> | null;
  quoteTranslation: Record<string, unknown> | null;
  override: Record<string, unknown> | null;
  sourcePolicyVersion: number;
}): string {
  return createHash("sha256").update(JSON.stringify(canonical({
    policy: EDITORIAL_POLICY_VERSION, ...target,
  }))).digest("hex");
}

/** Missing, failed or old analysis is not an approvable proposal, even if a legacy publication is public. */
export async function getReviewProposal(articleId: string, db: Db = sql): Promise<ReviewProposal | null> {
  const [row] = await db<ProposalRow[]>`
    SELECT jsonb_build_object(
             'id', a.id, 'revision', a.revision, 'source_id', a.source_id, 'identity_key', a.identity_key,
             'url', a.url, 'title', a.title, 'author', a.author, 'language', a.language,
             'published_at', a.published_at, 'published_at_claim', a.published_at_claim,
             'discovered_at', a.discovered_at, 'timeline_at', a.timeline_at,
             'backfill', a.backfill, 'backfill_reason', a.backfill_reason,
             'source_updated_at', a.source_updated_at, 'content_hash', a.content_hash,
             'excerpt', a.excerpt, 'body_text', a.body_text, 'body_html', a.body_html,
             'body_status', a.body_status, 'media', a.media, 'x_post', a.x_post,
             'x_article', a.x_article, 'raw', a.raw
           ) AS article,
           jsonb_build_object(
             'id', s.id, 'name', s.name, 'kind', s.kind, 'config', s.config,
             'tags', s.tags, 'first_party', s.first_party, 'owner_entity_id', s.owner_entity_id,
             'tier', s.tier, 'participation_mode', s.participation_mode,
             'site_fulltext', s.site_fulltext, 'syndicate_fulltext', s.syndicate_fulltext,
             'enabled', s.enabled
           ) AS source,
           jsonb_build_object(
             'id', an.id, 'input_revision', an.input_revision, 'origin', an.origin,
             'model', an.model, 'prompt_version', an.prompt_version, 'receipt_ids', an.receipt_ids,
             'relevance', an.relevance, 'category', an.category, 'tags', an.tags,
             'subjects', an.subjects, 'title_zh', an.title_zh, 'summary_zh', an.summary_zh,
             'reason_zh', an.reason_zh, 'score', an.score, 'selected', an.selected,
             'output', an.output
           ) AS analysis,
           CASE WHEN tr.article_id IS NULL THEN NULL ELSE jsonb_build_object(
             'revision', tr.revision, 'title', tr.title, 'body_html', tr.body_html,
             'body_text', tr.body_text, 'complete', tr.complete, 'origin', tr.origin
           ) END AS translation,
           CASE WHEN qt.tweet_id IS NULL THEN NULL ELSE jsonb_build_object(
             'tweet_id', qt.tweet_id, 'text_hash', qt.text_hash, 'text_zh', qt.text_zh, 'origin', qt.origin
           ) END AS quote_translation,
           CASE WHEN o.article_id IS NULL THEN NULL ELSE jsonb_build_object(
             'version', o.version, 'fields', o.fields, 'visibility', o.visibility
           ) END AS override_data,
           sp.version AS source_policy_version
    FROM articles a
    JOIN sources s ON s.id = a.source_id
    JOIN LATERAL (
      SELECT * FROM analyses WHERE article_id = a.id AND input_revision = a.revision ORDER BY id DESC LIMIT 1
    ) an ON true
    LEFT JOIN translations tr ON tr.article_id = a.id AND tr.lang = 'zh' AND tr.revision >= a.revision
    LEFT JOIN quote_translations qt ON qt.tweet_id = substring(a.x_post->'quoted'->>'url' from '/status/([0-9]+)')
    LEFT JOIN editorial_overrides o ON o.article_id = a.id
    LEFT JOIN source_auto_public_policies sp ON sp.source_id = s.id
    WHERE a.id = ${articleId} AND a.processing_state = 'analyzed'
      AND an.relevance = 'pass' AND an.title_zh IS NOT NULL AND an.summary_zh IS NOT NULL`;
  if (!row) return null;
  const articleRevision = Number(row.article.revision);
  const analysisId = Number(row.analysis.id);
  const overrideVersion = Number(row.override_data?.version ?? 0);
  const sourcePolicyVersion = Number(row.source_policy_version ?? 0);
  const fingerprint = fingerprintReviewTarget({
    article: row.article, source: row.source, analysis: row.analysis,
    translation: row.translation, quoteTranslation: row.quote_translation,
    override: row.override_data, sourcePolicyVersion,
  });
  return { articleId, articleRevision, analysisId, overrideVersion, sourcePolicyVersion, fingerprint };
}

/**
 * A single repeatable-read snapshot prevents mixing a proposal and decision from different commits.
 * This is a review-state read, not by itself a public-exit gate: a later content query needs its own
 * transactionally consistent projection check and mutation-time invalidation (slices B/C).
 */
export async function getEffectiveReview(articleId: string): Promise<EffectiveReview> {
  return sql.begin(async (tx) => {
    await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
    const proposal = await getReviewProposal(articleId, tx);
    const [row] = await tx<{
    status: EffectiveReview["status"]; fingerprint: string | null; version: number;
    curated_status: string | null; curated_fingerprint: string | null; curated_review_version: number | null;
    }[]>`
      SELECT r.status, r.fingerprint, r.version,
             c.status AS curated_status, c.fingerprint AS curated_fingerprint, c.review_version AS curated_review_version
      FROM editorial_reviews r LEFT JOIN editorial_curations c ON c.article_id = r.article_id
      WHERE r.article_id = ${articleId}`;
    const current = !!proposal && row?.fingerprint === proposal.fingerprint;
    const status = current ? row!.status : "pending";
    return {
      proposal, status, version: row?.version ?? 0,
      curated: status === "approved" && row!.curated_status === "approved" &&
        row!.curated_fingerprint === proposal!.fingerprint && row!.curated_review_version === row!.version,
    };
  });
}

/** Bring the queue row up to the current proposal under the article lock. No approval is inferred. */
export async function proposeReview(articleId: string): Promise<ReviewProposal | null> {
  return sql.begin(async (tx) => {
    const [article] = await tx<{ source_id: string }[]>`SELECT source_id FROM articles WHERE id = ${articleId} FOR UPDATE`;
    if (!article) return null;
    await tx`SELECT id FROM sources WHERE id = ${article.source_id} FOR SHARE`;
    const proposal = await getReviewProposal(articleId, tx);
    if (!proposal) {
      const reset = await tx`UPDATE editorial_reviews SET status = 'pending', fingerprint = NULL,
        article_revision = NULL, analysis_id = NULL, override_version = 0, source_policy_version = 0,
        version = version + 1, reviewed_by = NULL, reason = NULL, reviewed_at = NULL, updated_at = now()
        WHERE article_id = ${articleId} AND (status <> 'pending' OR fingerprint IS NOT NULL)`;
      if (reset.count) await tx`UPDATE editorial_curations SET status = 'pending', fingerprint = NULL, review_version = NULL,
        version = version + 1, reviewed_by = NULL, reason = NULL, reviewed_at = NULL, updated_at = now()
        WHERE article_id = ${articleId}`;
      return null;
    }
    const [current] = await tx<{ fingerprint: string | null }[]>`SELECT fingerprint FROM editorial_reviews WHERE article_id = ${articleId} FOR UPDATE`;
    if (current?.fingerprint === proposal.fingerprint) return proposal;
    await tx`
      INSERT INTO editorial_reviews (article_id, fingerprint, article_revision, analysis_id, override_version, source_policy_version)
      VALUES (${articleId}, ${proposal.fingerprint}, ${proposal.articleRevision}, ${proposal.analysisId},
              ${proposal.overrideVersion}, ${proposal.sourcePolicyVersion})
      ON CONFLICT (article_id) DO UPDATE SET
        status = 'pending', fingerprint = EXCLUDED.fingerprint, article_revision = EXCLUDED.article_revision,
        analysis_id = EXCLUDED.analysis_id, override_version = EXCLUDED.override_version,
        source_policy_version = EXCLUDED.source_policy_version, version = editorial_reviews.version + 1,
        reviewed_by = NULL, reason = NULL, reviewed_at = NULL, updated_at = now()`;
    await tx`UPDATE editorial_curations SET status = 'pending', fingerprint = NULL, review_version = NULL,
      version = version + 1, reviewed_by = NULL, reason = NULL, reviewed_at = NULL, updated_at = now()
      WHERE article_id = ${articleId}`;
    return proposal;
  });
}

/** Revoke a grant for a change that does not itself alter the proposal fingerprint.
 * The caller holds the article row lock and must reproject before committing. */
export async function invalidateArticleReviewTx(tx: Tx, articleId: string): Promise<void> {
  const reset = await tx`UPDATE editorial_reviews SET status = 'pending', version = version + 1,
    reviewed_by = NULL, reason = NULL, reviewed_at = NULL, updated_at = now()
    WHERE article_id = ${articleId} AND status <> 'pending'`;
  if (reset.count) await tx`UPDATE editorial_curations SET status = 'pending', fingerprint = NULL, review_version = NULL,
    version = version + 1, reviewed_by = NULL, reason = NULL, reviewed_at = NULL, updated_at = now()
    WHERE article_id = ${articleId}`;
}

export class StaleSourcePolicy extends Error {
  constructor() { super("信源自动发布设置版本已改变，请刷新后重试"); }
}

/** Explicit source allowlist, version checked and audited; all sources default to off. */
export async function setSourceAutoPublic(
  sourceId: string,
  input: { enabled: boolean; version: number; reason: string },
  actor: string,
): Promise<{ enabled: boolean; version: number }> {
  if (!input.reason.trim()) throw new Error("reason is required");
  if (!actor.trim()) throw new Error("actor is required");
  if (!Number.isInteger(input.version) || input.version < 0) throw new Error("invalid version");
  return withLockedSourceArticles(sourceId, async (tx, articleIds, sourceExists) => {
    if (!sourceExists) throw new Error("source not found");
    const [before] = await tx<{ enabled: boolean; version: number }[]>`
      SELECT enabled, version FROM source_auto_public_policies WHERE source_id = ${sourceId} FOR UPDATE`;
    if ((before?.version ?? 0) !== input.version) throw new StaleSourcePolicy();
    if (!before && !input.enabled) return { enabled: false, version: 0 };
    if (before?.enabled === input.enabled) return before;
    const version = input.version + 1;
    await tx`INSERT INTO source_auto_public_policies (source_id, enabled, version, changed_by, reason)
      VALUES (${sourceId}, ${input.enabled}, ${version}, ${actor}, ${input.reason})
      ON CONFLICT (source_id) DO UPDATE SET enabled = EXCLUDED.enabled, version = EXCLUDED.version,
      changed_by = EXCLUDED.changed_by, reason = EXCLUDED.reason, updated_at = now()`;
    await tx`INSERT INTO audit_log (actor, action, subject, reason, before, after)
      VALUES (${actor}, 'source.auto_public', ${`source:${sourceId}`}, ${input.reason},
        ${tx.json({ enabled: before?.enabled ?? false, version: before?.version ?? 0 })},
        ${tx.json({ enabled: input.enabled, version })})`;
    // Import lazily to keep the proposal/fingerprint module independent of its
    // own publication consumer. The source and all affected articles stay locked.
    const { publishArticleTx } = await import("../publication/publish.ts");
    for (const articleId of articleIds) await publishArticleTx(tx, articleId);
    return { enabled: input.enabled, version };
  });
}
