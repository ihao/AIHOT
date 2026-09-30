import { sql, type Tx } from "../db.ts";

export const CURATED_HOT_RULE_VERSION = "9btc-curated-heat-v1";

/** Public event evidence requires a current human curation of the exact approved version. */
export const curatedEvidence = (publicationAlias: string, at: Date) => sql`
  ${sql(publicationAlias)}.visibility = 'public' AND ${sql(publicationAlias)}.eligible
  AND EXISTS (
    SELECT 1 FROM editorial_reviews er JOIN editorial_curations ec ON ec.article_id = er.article_id
    WHERE er.article_id = ${sql(publicationAlias)}.article_id
      AND er.status = 'approved' AND ec.status = 'approved'
      AND ec.fingerprint = er.fingerprint AND ec.review_version = er.version
  )
  AND (NOT ${sql(publicationAlias)}.selected OR ${sql(publicationAlias)}.visible_after <= ${at})`;

/** Membership changed, so the event curation must be reviewed again; the all-feed approval remains. */
export async function invalidateStoryCurationTx(tx: Tx, articleId: string): Promise<void> {
  await tx`UPDATE editorial_curations SET status = 'pending', fingerprint = NULL, review_version = NULL,
    version = version + 1, reviewed_by = NULL, reason = NULL, reviewed_at = NULL, updated_at = now()
    WHERE article_id = ${articleId} AND status <> 'pending'`;
}
