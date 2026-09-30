// Deterministic daily composition: only current verified titles, summaries and original links.
// Preparing and publishing have separate transactions; the latter rechecks the exact snapshot.
import { beijingDate } from '@aihot/contracts/time';
import { config } from '../config.ts';
import { sql } from '../db.ts';
import { createDailyDraft, publishDailyDraft, StaleReportDraft } from './editorial.ts';
const ACTOR = 'automatic-policy';
export function prepareAutomaticDaily(cutoff = new Date()) {
  if (config.editorialMode !== 'automatic') throw new Error('automatic editorial mode is required');
  return createDailyDraft(ACTOR, cutoff, { automatic: true });
}
export function publishPreparedAutomaticDaily(draftId: number) {
  if (config.editorialMode !== 'automatic') throw new Error('automatic editorial mode is required');
  return publishDailyDraft(draftId, ACTOR, '自动策略发布当前核验精选摘要，不生成额外新闻结论', { automatic: true });
}
async function alreadyPublished(key: string) {
  const [report] = await sql`SELECT id FROM reports WHERE kind='daily' AND key=${key} AND active_version_id IS NOT NULL`;
  return !!report;
}
export async function publishAutomaticDaily(cutoff = new Date()) {
  const key = beijingDate(cutoff);
  if (config.editorialMode !== 'automatic') return { status: 'skipped' as const, key, reason: 'manual_mode' };
  if (key !== beijingDate(new Date())) return { status: 'skipped' as const, key, reason: 'expired_cutoff' };
  // Two preparations at most: a changed snapshot gets one fresh attempt, never an unbounded loop.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (await alreadyPublished(key)) return { status: 'skipped' as const, key, reason: 'already_published' };
    try {
      const draft = await prepareAutomaticDaily(cutoff);
      const published = await publishPreparedAutomaticDaily(draft.draftId);
      return { status: 'published' as const, ...published, candidates: draft.candidates };
    } catch (error) {
      if (!(error instanceof StaleReportDraft)) throw error;
      if (/时间窗口|空日报/.test(error.message)) return { status: 'skipped' as const, key, reason: 'empty_window' };
      if (attempt === 1) return { status: 'skipped' as const, key, reason: await alreadyPublished(key) ? 'already_published' : 'candidate_changed' };
    }
  }
  return { status: 'skipped' as const, key, reason: 'candidate_changed' };
}
