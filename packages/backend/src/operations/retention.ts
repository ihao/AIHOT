// Daily housekeeping: expired leases, old run history, files past their life and derived caches.
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.ts";
import { sql } from "../db.ts";

/** Derived caches (proxied images, share cards and posters) are rebuilt on demand; drop ones older than a month. */
async function pruneCache(dir: string, maxAgeMs: number, now: number): Promise<number> {
  let removed = 0;
  const walk = async (d: string): Promise<void> => {
    const entries = await readdir(d, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        await walk(p);
        continue;
      }
      const info = await stat(p).catch(() => null);
      if (info && now - info.mtimeMs > maxAgeMs) {
        await unlink(p).catch(() => {});
        removed += 1;
      }
    }
  };
  await walk(dir);
  return removed;
}

/** Personal screenshots need verifiable deletion; a failed unlink keeps its DB reference for retry. */
async function expireFeedbackScreenshots(now: Date, maxAgeMs: number): Promise<{ expired: number; removed: number }> {
  const cutoff = new Date(now.getTime() - maxAgeMs);
  const dir = path.join(config.dataDir, "feedback-screenshots");
  const keys = await sql<{ key: string }[]>`
    SELECT DISTINCT screenshot_key AS key FROM feedback
    WHERE screenshot_key LIKE 'local:%' AND created_at < ${cutoff}`;
  let expired = 0;
  let removed = 0;
  for (const { key } of keys) {
    const name = key.slice("local:".length);
    if (!/^[\w.-]+$/.test(name) || name.startsWith(".") || name.includes("..")) throw new Error("unsafe feedback screenshot key");
    const [recent] = await sql`SELECT 1 FROM feedback WHERE screenshot_key = ${key} AND created_at >= ${cutoff} LIMIT 1`;
    if (!recent) {
      try {
        await unlink(path.join(dir, name));
        removed += 1;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    const changed = await sql`
      UPDATE feedback SET screenshot_key = 'gone:expired', updated_at = now()
      WHERE screenshot_key = ${key} AND created_at < ${cutoff}`;
    expired += changed.count;
  }
  // A crash between writing a file and inserting feedback can leave an orphan. Only remove it
  // after its age limit and a database reference check; report real unlink failures to the job.
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const file = path.join(dir, entry.name);
    const info = await stat(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (!info || now.getTime() - info.mtimeMs <= maxAgeMs) continue;
    const [linked] = await sql`SELECT 1 FROM feedback WHERE screenshot_key = ${`local:${entry.name}`} LIMIT 1`;
    if (linked) continue;
    try {
      await unlink(file);
      removed += 1;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return { expired, removed };
}

export async function dailyRetention(now = new Date()) {
  const leases = await sql`DELETE FROM delivery_leases WHERE expires_at < ${now}`;
  // Scheduled-task history: 30 days (failures 90) is enough for the runs view.
  const runs = await sql`DELETE FROM job_runs WHERE started_at < ${new Date(now.getTime() - 30 * 86400_000)} AND (status IS DISTINCT FROM 'failed' OR started_at < ${new Date(now.getTime() - 90 * 86400_000)})`;
  // Raw files with a bounded life.
  const files = await sql<{ key: string }[]>`DELETE FROM stored_files WHERE expires_at < ${now} RETURNING key`;
  for (const f of files) await unlink(path.join(config.dataDir, f.key)).catch(() => {});
  const monthMs = 30 * 86400_000;
  const screenshots = await expireFeedbackScreenshots(now, monthMs);
  const prunedCache = (await pruneCache(path.join(config.dataDir, "imgcache"), monthMs, now.getTime())) + (await pruneCache(path.join(config.dataDir, "ogcache"), monthMs, now.getTime()));
  return { deletedLeases: leases.count, deletedJobRuns: runs.count, deletedFiles: files.length, expiredScreenshots: screenshots.expired, prunedScreenshots: screenshots.removed, prunedCache };
}
