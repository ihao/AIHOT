// Source-local circuit breaker. A terminal round is consumed once, independently of its ID or
// completion order. Existing publication grants are not touched by this temporary paid-work pause.
import { config } from '../config.ts';
import { sql } from '../db.ts';

const PREFIX = 'automatic.source-safety.';
const PAUSE_MS = 30 * 60_000;
interface SafetyState { cursor: number; streak: number; until: string | null }

export function advanceSafetyStreak(streak: number, verdict: string | null, paused = false) {
  if (paused || verdict !== 'contradicted') return { streak: 0, pause: false };
  const next = streak + 1;
  return next >= 5 ? { streak: 0, pause: true } : { streak: next, pause: false };
}

export class AutomaticSourcePaused extends Error {
  readonly until: Date;
  constructor(until: Date) { super('automatic source verification pause'); this.until = until; }
}

/** No calls to a provider: durable terminal-round inspection, also run before new paid work. */
export async function refreshAutomaticSafety(now = new Date()) {
  if (config.editorialMode !== 'automatic') return { consumed: 0, paused: 0 };
  return sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('automatic_source_safety'))`;
    const rows = await tx<{ id: number; source_id: string; verdict: string | null }[]>`
      SELECT av.id,a.source_id,CASE WHEN av.status='rejected' THEN av.verification->>'verdict' END AS verdict
      FROM automatic_verifications av JOIN articles a ON a.id=av.article_id
      WHERE av.status IN ('accepted','rejected','stale') AND av.safety_processed_at IS NULL
      ORDER BY av.updated_at,av.id LIMIT 500`;
    const states = new Map<string, SafetyState>();
    let paused = 0;
    for (const row of rows) {
      let state = states.get(row.source_id);
      if (!state) {
        const [saved] = await tx<{ value: SafetyState }[]>`SELECT value FROM settings WHERE key=${PREFIX + row.source_id}`;
        state = saved?.value ?? { cursor: 0, streak: 0, until: null };
      }
      const next = advanceSafetyStreak(state.streak, row.verdict, !!state.until && new Date(state.until) > now);
      state = { cursor: Math.max(state.cursor, row.id), streak: next.streak,
        until: next.pause ? new Date(now.getTime() + PAUSE_MS).toISOString() : state.until };
      if (next.pause) {
        paused++;
        await tx`INSERT INTO audit_log(actor,action,subject,reason,after)
          VALUES('automatic-policy','automatic.source-pause',${`source:${row.source_id}`},
            '连续五条终止核验明确矛盾，暂停该来源的新分析与核验30分钟',${tx.json({ verificationId: row.id, until: state.until })})`;
      }
      states.set(row.source_id, state);
      await tx`UPDATE automatic_verifications SET safety_processed_at=${now} WHERE id=${row.id}`;
    }
    for (const [sourceId, state] of states) {
      await tx`INSERT INTO settings(key,value,updated_by) VALUES(${PREFIX + sourceId},${tx.json(state as never)},'automatic-policy')
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=now()`;
    }
    return { consumed: rows.length, paused };
  });
}

export async function sourcePauseUntil(sourceId: string, now = new Date()): Promise<Date | null> {
  if (config.editorialMode !== 'automatic') return null;
  const [saved] = await sql<{ value: SafetyState }[]>`SELECT value FROM settings WHERE key=${PREFIX + sourceId}`;
  const until = saved?.value.until ? new Date(saved.value.until) : null;
  return until && until > now ? until : null;
}

export async function checkAutomaticSourcePause(articleId: string): Promise<void> {
  if (config.editorialMode !== 'automatic') return;
  await refreshAutomaticSafety();
  const [article] = await sql<{ source_id: string }[]>`SELECT source_id FROM articles WHERE id=${articleId}`;
  const until = article ? await sourcePauseUntil(article.source_id) : null;
  if (until) throw new AutomaticSourcePaused(until);
}

export async function automaticSafetyStates() {
  return sql<{ source_id: string; source_name: string; cursor: number; streak: number; until: string | null; paused: boolean }[]>`
    SELECT s.id AS source_id,s.name AS source_name,(settings.value->>'cursor')::bigint AS cursor,
      (settings.value->>'streak')::int AS streak,settings.value->>'until' AS until,
      coalesce((settings.value->>'until')::timestamptz>now(),false) AS paused
    FROM settings JOIN sources s ON settings.key=${PREFIX}||s.id ORDER BY paused DESC,s.name`;
}
