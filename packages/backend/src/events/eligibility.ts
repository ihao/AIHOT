import { config } from "../config.ts";
import { AUTOMATIC_RULE_VERSION, currentAutomaticDecision } from "../editorial/automatic-verification.ts";
import { considerAutoPublicationTx } from "../editorial/auto-publication.ts";
import { sha256, stableJson } from "../lib/ids.ts";
import { sql, type Tx } from "../db.ts";

export const CURATED_HOT_RULE_VERSION = "9btc-curated-heat-v1";

/** Current exact curation, including a bound automatic verification. A null clock omits only the release gate. */
export const curatedEvidence = (publicationAlias: string, at: Date | null, includeAutomatic = config.editorialMode === "automatic") => sql`
  ${sql(publicationAlias)}.visibility = 'public' AND ${sql(publicationAlias)}.eligible
  AND EXISTS (
    SELECT 1 FROM editorial_reviews er JOIN editorial_curations ec ON ec.article_id = er.article_id
    WHERE er.article_id = ${sql(publicationAlias)}.article_id
      AND (er.status = 'approved' OR (${includeAutomatic} AND er.status = 'auto_public' AND EXISTS (
        SELECT 1 FROM automatic_verifications av JOIN articles a ON a.id=av.article_id
          JOIN analyses an ON an.id=av.analysis_id JOIN source_auto_public_policies sp ON sp.source_id=a.source_id
        WHERE av.article_id=er.article_id AND av.status='accepted' AND av.selected
          AND av.article_revision=a.revision AND av.analysis_id=er.analysis_id AND av.final_fingerprint=er.fingerprint
          AND av.analysis_id=${sql(publicationAlias)}.analysis_id
          AND av.analysis_id=(SELECT max(latest.id) FROM analyses latest WHERE latest.article_id=a.id AND latest.input_revision=a.revision)
          AND av.automatic_rule_version=${AUTOMATIC_RULE_VERSION} AND sp.enabled
          AND sp.version=av.source_policy_version AND sp.version=er.source_policy_version
          AND av.final_copy=jsonb_build_object('titleZh',an.title_zh,'summaryZh',an.summary_zh,'reasonZh',an.reason_zh,'category',an.category)
          AND NOT EXISTS(SELECT 1 FROM editorial_overrides o WHERE o.article_id=a.id)
          AND NOT EXISTS(SELECT 1 FROM audit_log log WHERE log.subject='content:'||a.id AND log.action IN ('content.review','content.curation'))
      ))) AND ec.status = 'approved'
      AND ec.fingerprint = er.fingerprint AND ec.review_version = er.version
  )
  AND (${at}::timestamptz IS NULL OR NOT ${sql(publicationAlias)}.selected OR ${sql(publicationAlias)}.visible_after <= ${at})`;

/** Membership changed, so the event curation must be reviewed again; the all-feed approval remains. */
export async function invalidateStoryCurationTx(tx: Tx, articleId: string): Promise<void> {
  await tx`UPDATE editorial_curations SET status = 'pending', fingerprint = NULL, review_version = NULL,
    version = version + 1, reviewed_by = NULL, reason = NULL, reviewed_at = NULL, updated_at = now()
    WHERE article_id = ${articleId} AND status <> 'pending'`;
  if (config.editorialMode === "automatic") {
    const decision = await currentAutomaticDecision(tx, articleId);
    if (!decision?.selected) return;
    await considerAutoPublicationTx(tx, articleId);
    const membership = await tx`SELECT fa.fact_id,fa.role,f.story_id,s.version AS story_version
      FROM fact_articles fa JOIN facts f ON f.id=fa.fact_id LEFT JOIN stories s ON s.id=f.story_id
      WHERE fa.article_id=${articleId} ORDER BY fa.fact_id,fa.role`;
    const hash = sha256(stableJson(membership));
    await tx`INSERT INTO automatic_curation_restorations(article_id,verification_id,membership_hash)
      VALUES(${articleId},${decision.verificationId},${hash}) ON CONFLICT DO NOTHING`;
  }
}
