import { sql, type Db } from '../db.ts';
import { config } from '../config.ts';
import { STALE_ON_DISCOVERY_MS, FUTURE_TOLERANCE_MS } from './materials.ts';

/** Automatic processing uses source time, never the time a crawler found a page. */
export function freshnessReason(publishedAt: Date | null | undefined, now = new Date()): 'undated' | 'expired' | 'future' | null {
  if (!publishedAt || !Number.isFinite(publishedAt.getTime())) return 'undated';
  if (publishedAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) return 'future';
  return now.getTime() - publishedAt.getTime() > STALE_ON_DISCOVERY_MS ? 'expired' : null;
}

export async function automaticFreshnessReason(articleId: string, db: Db = sql) {
  if (config.editorialMode !== 'automatic') return null;
  const [a] = await db<{published_at: Date | null}[]>`SELECT published_at FROM articles WHERE id=${articleId}`;
  return a ? freshnessReason(a.published_at) : null;
}

/** Keep archived/public records intact; settle only unfinished automatic work. */
export async function skipExpiredProcessing(articleId: string, db: Db = sql): Promise<boolean> {
  const reason = await automaticFreshnessReason(articleId, db);
  if (!reason) return false;
  await db`UPDATE articles SET processing_state='skipped',processing_error=${`freshness: ${reason}`},
    processing_retry_at=NULL,processing_queued_at=NULL WHERE id=${articleId} AND processing_state IN ('new','failed')`;
  return true;
}
