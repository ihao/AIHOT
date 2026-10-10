import { sql, type Db } from "../db.ts";
import { config } from "../config.ts";
import { FUTURE_TOLERANCE_MS } from "./materials.ts";

/** Saved current-revision judgement, independent of prompt changes and later pipeline failures. */
export async function savedAnalysis(articleId: string, db: Db = sql) {
  const [row] = await db<{ id: number; revision: number; relevance: string; published: boolean; complete: boolean }[]>`
    SELECT n.id, a.revision, n.relevance, coalesce(p.analysis_id = n.id, false) AS published,
      coalesce(p.analysis_id = n.id, false) AND (n.relevance <> 'pass' OR a.grouping_status = 'complete') AS complete
    FROM articles a JOIN LATERAL (
      SELECT id, relevance FROM analyses WHERE article_id = a.id AND input_revision = a.revision ORDER BY id DESC LIMIT 1
    ) n ON true LEFT JOIN publications p ON p.article_id = a.id
    WHERE a.id = ${articleId} AND NOT a.manual_processing`;
  return row ?? null;
}

export function freshnessReason(publishedAt: Date | null, now = new Date()): "undated" | "expired" | "future" | null {
  if (config.contentMaxAgeHours <= 0) return null;
  if (!publishedAt || !Number.isFinite(publishedAt.getTime())) return "undated";
  if (publishedAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) return "future";
  return now.getTime() - publishedAt.getTime() > config.contentMaxAgeHours * 3600_000 ? "expired" : null;
}

/** Queued work rechecks source/time. Saved explicit manual results may only finish their cache projection;
 * extraction and new analysis retain the normal age gate, and paused sources always stop. */
export async function skipIneligibleProcessing(articleId: string, db: Db = sql, allowSavedManualRecovery = false): Promise<boolean> {
  const [row] = await db<{ enabled: boolean; published_at: Date | null; manual_processing: boolean; saved_manual_recovery: boolean }[]>`
    SELECT s.enabled, a.published_at, a.manual_processing,
      (${allowSavedManualRecovery} AND NOT a.manual_processing AND a.processing_attempt_tag LIKE 'admin:_%' AND EXISTS (
        SELECT 1 FROM analyses n LEFT JOIN publications p ON p.article_id = a.id
        WHERE n.id = (SELECT max(id) FROM analyses WHERE article_id = a.id AND input_revision = a.revision)
          AND (p.analysis_id IS DISTINCT FROM n.id OR (n.relevance = 'pass' AND a.grouping_status <> 'complete'))
      )) AS saved_manual_recovery
    FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.id = ${articleId}`;
  if (!row) return false;
  const reason = !row.enabled ? "source_disabled" : row.manual_processing || row.saved_manual_recovery ? null : freshnessReason(row.published_at);
  if (!reason) return false;
  await db`UPDATE articles SET processing_state = 'skipped', processing_error = ${`eligibility: ${reason}`},
    processing_retry_at = NULL, processing_queued_at = NULL WHERE id = ${articleId} AND processing_state IN ('new', 'failed')`;
  return true;
}
