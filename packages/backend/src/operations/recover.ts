// In-doubt work retains its receipt and billing evidence. Protected model and benchmark requests
// wait for confirmed billing before release; other unknown requests may be released automatically
// once after half an hour. A primary handed to an explicitly configured backup stays unknown for
// billing, with its original money reserved; the backup has its own receipt and admission checks.
import { audit, Conflict } from "../audit.ts";
import { sql } from "../db.ts";
import { resumeAfterRelease } from "../jobs/content.ts";
import { sweepUngrouped } from "../jobs/events.ts";
import { retryReleasedReceiptJobs } from "../jobs/queue.ts";
import { markStaleDeliveries } from "../notify/deliver.ts";
import { awaitingRelease, markStalePendingReceipts, releaseUnknownReceipt } from "../providers/receipts.ts";
import { isModelRequest, lockModelCost, releaseModelCost } from "../providers/model-cost.ts";

const AUTO_RELEASE_AFTER_MS = 30 * 60_000;
export const AUTO_RELEASE_NOTE = "自动放行：结果未知超过 30 分钟，未核对是否计费";

async function release(id: number, error: string, actor: string, note: string, billed: boolean | null) {
  return sql.begin(async (tx) => {
    await lockModelCost(tx);
    const [current] = await tx<{ status: string; service: string; model: string | null; purpose: string }[]>`SELECT status, service, model, purpose FROM receipts WHERE id = ${id} FOR UPDATE`;
    if (current?.status !== "unknown") return null;
    // An unconfirmed bill remains reserved. Only an explicit supplier confirmation frees money.
    if (billed === null && (isModelRequest(current) || current.purpose === "verification_benchmark")) return null;
    if (billed === false) await releaseModelCost(tx, id);
    const receipt = await releaseUnknownReceipt(tx, id, error);
    if (!receipt) return null;
    const requeued = await resumeAfterRelease(receipt, tx);
    await audit(actor, "receipt.release", `receipt:${id}`, note, { status: "unknown" }, { status: "failed", billed, requeued }, { db: tx });
    return { id, status: "failed", subject: receipt.subject, purpose: receipt.purpose, requeued };
  });
}

/** Record verified billing, or explicitly unknown billing for an authorized manual recovery. */
export async function releaseReceipt(id: number, input: { billed: boolean | null; note: string }, actor: string) {
  if (!input.note?.trim()) throw new Error("note is required");
  if (input.billed !== null && typeof input.billed !== "boolean") throw new Error("billed must be true, false or null");
  const [row] = await sql<{ status: string }[]>`SELECT status FROM receipts WHERE id = ${id}`;
  if (!row) return null;
  if (row.status !== "unknown") throw new Conflict("只有结果未知的回执需要人工核对");
  const error = input.billed === null ? `人工放行：计费未知，按授权恢复。${input.note}`
    : `人工核对：${input.billed ? "供应商已计费但结果未取回" : "供应商未计费"}。${input.note}`;
  return release(id, error, actor, input.note, input.billed);
}

/**
 * Non-model unknown receipts older than half an hour may be released once without billing confirmation.
 * Model and benchmark receipts require confirmation; a second non-model loss waits for the admin.
 * Primaries continued by a backup are not awaiting release: that would revive their old request.
 */
export async function autoReleaseUnknownReceipts(now = Date.now()) {
  const rows = await sql<{ id: number }[]>`
    SELECT r.id FROM receipts r
    WHERE ${awaitingRelease(sql`r`)} AND r.updated_at < ${new Date(now - AUTO_RELEASE_AFTER_MS)}
      AND NOT EXISTS (SELECT 1 FROM receipt_attempts a WHERE a.receipt_id = r.id AND a.error LIKE ${AUTO_RELEASE_NOTE + "%"})
      AND r.model IS NULL AND r.service NOT IN ('llm', 'embedding', 'dashscope', 'deepseek', 'zhipu', 'mimo')
      AND r.purpose <> 'verification_benchmark'
    ORDER BY r.id LIMIT 200`;
  let released = 0;
  let requeued = 0;
  for (const r of rows) {
    const done = await release(r.id, AUTO_RELEASE_NOTE, "ops.recover", "结果未知，自动放行一次", null);
    if (done) released += 1;
    if (done?.requeued) requeued += 1;
  }
  return { released, requeued };
}

/** ops.recover, every 10 minutes. */
export async function recoverStaleWork() {
  return { receipts: await markStalePendingReceipts(), released: await autoReleaseUnknownReceipts(), jobs: await retryReleasedReceiptJobs(), grouping: await sweepUngrouped(), deliveries: await markStaleDeliveries() };
}
