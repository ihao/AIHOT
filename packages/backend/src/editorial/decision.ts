// Human editorial decisions and their public projection commit together. Lock order:
// article -> report candidate lock -> source -> review/curation -> publication/ledger.
import { z } from "zod";
import { sql, type Tx } from "../db.ts";
import { publishArticleTx } from "../publication/publish.ts";
import { getReviewProposal } from "./review.ts";

export class StaleReview extends Error {
  code = "conflict";
  constructor() { super("内容或审核状态已改变，请刷新后重试"); }
}

const ReviewDecision = z.object({
  status: z.enum(["approved", "rejected"]),
  curated: z.boolean().optional(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  version: z.number().int().nonnegative(),
  reason: z.string().trim().min(1).max(2000),
}).strict();

const CurationDecision = z.object({
  approved: z.boolean(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  reviewVersion: z.number().int().positive(),
  version: z.number().int().nonnegative(),
  reason: z.string().trim().min(1).max(2000),
}).strict();

async function lockTarget(tx: Tx, articleId: string): Promise<boolean> {
  const [article] = await tx<{ source_id: string }[]>`SELECT source_id FROM articles WHERE id = ${articleId} FOR UPDATE`;
  if (!article) return false;
  await tx`SELECT pg_advisory_xact_lock_shared(hashtext('report_candidates'))`;
  await tx`SELECT id FROM sources WHERE id = ${article.source_id} FOR SHARE`;
  return true;
}

export async function decideArticleReview(articleId: string, raw: unknown, actor: string) {
  const parsed = ReviewDecision.safeParse(raw);
  if (!parsed.success) throw Object.assign(new Error("invalid review decision"), { statusCode: 400 });
  const input = parsed.data;
  if (input.curated && input.status !== "approved") throw Object.assign(new Error("rejected content cannot be curated"), { statusCode: 400 });
  if (!actor.trim()) throw new Error("actor is required");
  return sql.begin(async (tx) => {
    if (!await lockTarget(tx, articleId)) return null;
    const proposal = await getReviewProposal(articleId, tx);
    const [review] = await tx<{ status: string; fingerprint: string | null; version: number }[]>`
      SELECT status, fingerprint, version FROM editorial_reviews WHERE article_id = ${articleId} FOR UPDATE`;
    if (!proposal || proposal.fingerprint !== input.fingerprint || !review ||
        review.fingerprint !== input.fingerprint || review.version !== input.version) throw new StaleReview();
    await tx`UPDATE editorial_reviews SET status = ${input.status}, version = version + 1,
      reviewed_by = ${actor}, reason = ${input.reason}, reviewed_at = now(), updated_at = now()
      WHERE article_id = ${articleId}`;
    if (input.curated) {
      await tx`INSERT INTO editorial_curations
        (article_id, status, fingerprint, review_version, version, reviewed_by, reason, reviewed_at)
        VALUES (${articleId}, 'approved', ${input.fingerprint}, ${review.version + 1}, 1, ${actor}, ${input.reason}, now())
        ON CONFLICT (article_id) DO UPDATE SET status = EXCLUDED.status, fingerprint = EXCLUDED.fingerprint,
          review_version = EXCLUDED.review_version, version = editorial_curations.version + 1,
          reviewed_by = EXCLUDED.reviewed_by, reason = EXCLUDED.reason,
          reviewed_at = EXCLUDED.reviewed_at, updated_at = now()`;
    } else {
      await tx`UPDATE editorial_curations SET status = 'pending', fingerprint = NULL, review_version = NULL,
        version = version + 1, reviewed_by = NULL, reason = NULL, reviewed_at = NULL, updated_at = now()
        WHERE article_id = ${articleId}`;
    }
    const publication = await publishArticleTx(tx, articleId);
    await tx`INSERT INTO audit_log (actor, action, subject, reason, before, after)
      VALUES (${actor}, 'content.review', ${`content:${articleId}`}, ${input.reason},
        ${tx.json({ status: review.status, version: review.version })},
        ${tx.json({ status: input.status, curated: !!input.curated, version: review.version + 1, fingerprint: input.fingerprint })})`;
    return { reviewVersion: review.version + 1, publication };
  });
}

export async function decideArticleCuration(articleId: string, raw: unknown, actor: string) {
  const parsed = CurationDecision.safeParse(raw);
  if (!parsed.success) throw Object.assign(new Error("invalid curation decision"), { statusCode: 400 });
  const input = parsed.data;
  if (!actor.trim()) throw new Error("actor is required");
  return sql.begin(async (tx) => {
    if (!await lockTarget(tx, articleId)) return null;
    const proposal = await getReviewProposal(articleId, tx);
    const [review] = await tx<{ status: string; fingerprint: string | null; version: number }[]>`
      SELECT status, fingerprint, version FROM editorial_reviews WHERE article_id = ${articleId} FOR UPDATE`;
    const [curation] = await tx<{ status: string; version: number }[]>`
      SELECT status, version FROM editorial_curations WHERE article_id = ${articleId} FOR UPDATE`;
    if (!proposal || proposal.fingerprint !== input.fingerprint || !review || review.status !== "approved" ||
        review.fingerprint !== input.fingerprint || review.version !== input.reviewVersion ||
        (curation?.version ?? 0) !== input.version) throw new StaleReview();
    const status = input.approved ? "approved" : "rejected";
    const nextVersion = input.version + 1;
    await tx`INSERT INTO editorial_curations
      (article_id, status, fingerprint, review_version, version, reviewed_by, reason, reviewed_at)
      VALUES (${articleId}, ${status}, ${input.fingerprint}, ${review.version}, ${nextVersion}, ${actor}, ${input.reason}, now())
      ON CONFLICT (article_id) DO UPDATE SET status = EXCLUDED.status, fingerprint = EXCLUDED.fingerprint,
        review_version = EXCLUDED.review_version, version = EXCLUDED.version, reviewed_by = EXCLUDED.reviewed_by,
        reason = EXCLUDED.reason, reviewed_at = EXCLUDED.reviewed_at, updated_at = now()`;
    const publication = await publishArticleTx(tx, articleId);
    await tx`INSERT INTO audit_log (actor, action, subject, reason, before, after)
      VALUES (${actor}, 'content.curation', ${`content:${articleId}`}, ${input.reason},
        ${tx.json({ status: curation?.status ?? 'pending', version: curation?.version ?? 0 })},
        ${tx.json({ status, version: nextVersion, reviewVersion: review.version, fingerprint: input.fingerprint })})`;
    return { curationVersion: nextVersion, publication };
  });
}
