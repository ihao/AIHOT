// Event jobs: serial grouping, debounced digests.
import type { PgBoss } from "pg-boss";
import { sql } from "../db.ts";
import { groupArticle } from "../events/group.ts";
import { composeStoryDigest } from "../events/digest.ts";
import { BudgetExceededError, ReceiptBusyError } from "../providers/receipts.ts";
import { settleNonEditorial } from "./content.ts";
import { ensureQueue, enqueue, QUEUES } from "./queue.ts";

export async function registerEventJobs(boss: PgBoss) {
  await ensureQueue(QUEUES.group);
  // Serial on purpose: two reports of the same new fact must not both create it.
  await boss.work<{ articleId: string; signalOnly?: boolean; force?: boolean }>(QUEUES.group, { localConcurrency: 1, pollingIntervalSeconds: 0.5 }, async ([job]) => {
    if (!job) return;
    try {
      // A discussion post comes here straight from collection: record it first (settleNonEditorial).
      if (job.data.signalOnly && !job.data.force && !(await settleNonEditorial(job.data.articleId)).group) {
        await sql`DELETE FROM event_group_waits WHERE article_id=${job.data.articleId}`;
        return { verdict: "skipped" };
      }
      const result = await groupArticle(job.data.articleId, { signalOnly: job.data.signalOnly, force: job.data.force });
      if (result.storyId && !result.verdict.startsWith("signal")) {
        await enqueue(QUEUES.digest, { storyId: result.storyId }, { singletonKey: `story:${result.storyId}`, startAfter: 60 });
      }
      await sql`DELETE FROM event_group_waits WHERE article_id=${job.data.articleId}`;
      return result;
    } catch (error) {
      if (error instanceof BudgetExceededError || error instanceof ReceiptBusyError) {
        const retryAt = new Date(Date.now() + (error instanceof BudgetExceededError ? error.retryAfterSeconds : 60) * 1000);
        await sql`INSERT INTO event_group_waits(article_id,signal_only,force_regroup,retry_at,error)
          VALUES(${job.data.articleId},${!!job.data.signalOnly},${!!job.data.force},${retryAt},${error.message.slice(0,500)})
          ON CONFLICT(article_id) DO UPDATE SET signal_only=excluded.signal_only,
            force_regroup=event_group_waits.force_regroup OR excluded.force_regroup,
            retry_at=excluded.retry_at,queued_at=NULL,error=excluded.error,updated_at=now()`;
        return { verdict: "waiting", retryAt };
      }
      throw error;
    }
  });
  await ensureQueue(QUEUES.digest);
  await boss.work<{ storyId: number; afterCorrection?: boolean }>(QUEUES.digest, { localConcurrency: 3, pollingIntervalSeconds: 5 }, async ([job]) => {
    if (!job) return;
    return composeStoryDigest(job.data.storyId, { afterCorrection: job.data.afterCorrection });
  });
}

/** Requeue due provider waits atomically; an interrupted queued job is recovered after 30 minutes. */
export async function sweepGroupWaits(): Promise<{ enqueued: number }> {
  await ensureQueue(QUEUES.group);
  return sql.begin(async tx => {
    const rows = await tx<{ article_id: string; signal_only: boolean; force_regroup: boolean }[]>`
      SELECT article_id,signal_only,force_regroup FROM event_group_waits
      WHERE retry_at<=now() AND (queued_at IS NULL OR queued_at<now()-interval '30 minutes')
      ORDER BY retry_at LIMIT 100 FOR UPDATE SKIP LOCKED`;
    let enqueued = 0;
    for (const row of rows) {
      const job = await enqueue(QUEUES.group, { articleId: row.article_id, signalOnly: row.signal_only, force: row.force_regroup },
        { singletonKey: row.article_id }, tx);
      await tx`UPDATE event_group_waits SET queued_at=now(),updated_at=now() WHERE article_id=${row.article_id}`;
      if (job) enqueued++;
    }
    return { enqueued };
  });
}
