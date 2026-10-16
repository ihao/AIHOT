// Reconcile a frozen local export. The shared parser is pure; no database or provider is queried.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { modelTokenUsage } from "../../../packages/backend/src/providers/model-cost.ts";

const source = process.argv[2] ?? ".data/model-cost-audit-complete-20261004.json";
const raw = readFileSync(source, "utf8");
const data = JSON.parse(raw);
const rows = data.attempts;
assert.equal(new Set(rows.map(a => a.id)).size, rows.length);
const dayOf = at => new Date(Date.parse(at) + 8 * 3600_000).toISOString().slice(0, 10);
const usageOf = a => modelTokenUsage(a.usage, a.purpose === "embedding");
const cohortOf = a => a.purpose === "model_compatibility_probe" ? "experiment_probe"
  : ["verify_summary", "rewrite_verified_summary"].includes(a.purpose) ? "retired_verification_or_rewrite"
  : "processing_period_unclassified";
const groups = (items, key) => {
  const map = new Map();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return [...map.entries()];
};
const summarize = items => ({
  attempts: items.length, receipts: new Set(items.map(a => a.receipt_id)).size,
  received: items.filter(a => a.status === "received").length,
  failed: items.filter(a => a.status === "failed").length,
  unknown: items.filter(a => a.status === "unknown").length,
  missingOrInvalidUsage: items.filter(a => !usageOf(a)).length,
  inputTokens: items.reduce((n, a) => n + (usageOf(a)?.input ?? 0), 0),
  outputTokens: items.reduce((n, a) => n + (usageOf(a)?.output ?? 0), 0),
  cachedInputTokens: items.reduce((n, a) => n + (usageOf(a)?.cached ?? 0), 0),
  actualAmount: items.every(a => a.cost_basis === "actual" && a.cost !== null && a.currency === "CNY")
    ? items.reduce((n, a) => n + Number(a.cost), 0) : null,
  actualAmountMissing: items.filter(a => a.cost_basis !== "actual" || a.cost === null).length,
});
const retries = groups(rows, a => a.receipt_id).filter(([, a]) => a.length > 1).map(([receiptId, attempts]) => {
  assert.equal(new Set(attempts.map(a => a.logical_key)).size, 1);
  return { receiptId, purpose: attempts[0].purpose, model: attempts[0].model,
    receiptStatusAtSnapshot: attempts[0].receipt_status,
    requestFingerprint: createHash("sha256").update(attempts[0].logical_key).digest("hex"),
    attemptIds: attempts.map(a => a.id), attemptNumbers: attempts.map(a => a.attempt),
    extraSendsObserved: attempts.length - 1, ...summarize(attempts) };
});
const repeated = groups(data.rounds, r => `${r.article_id}@${r.article_revision}`)
  .filter(([, r]) => new Set(r.map(x => x.automatic_rule_version)).size > 1);
const current = data.rounds.filter(r => r.automatic_rule_version === data.rule);
const report = {
  source, sourceSha256: createHash("sha256").update(raw).digest("hex"), snapshotAt: data.at,
  query: { origin: "live", modelRequired: true, since: new Date(Date.parse(data.at) - 86400_000).toISOString(), until: data.at },
  completeNaturalDayAvailable: false, providerBillAvailable: false,
  total: summarize(rows),
  byBeijingDay: groups(rows, a => dayOf(a.started_at)).map(([day, a]) => ({ day, ...summarize(a) })),
  byCohort: groups(rows, cohortOf).map(([cohort, a]) => ({ cohort, ...summarize(a) })),
  byPurposeModel: groups(rows, a => `${a.purpose}/${a.model}`).map(([purposeModel, a]) => ({ purposeModel, ...summarize(a) })),
  retries, extraSendsObserved: retries.reduce((n, r) => n + r.extraSendsObserved, 0),
  multiRuleArticleRevisions: repeated.length,
  currentRuleSnapshot: { rounds: current.length, articles: new Set(current.map(r => r.article_id)).size,
    public: current.filter(r => r.live_public).length, selected: current.filter(r => r.live_selected).length },
  failures: rows.filter(a => a.status === "failed").map(a => ({ attemptId: a.id, receiptId: a.receipt_id,
    purpose: a.purpose, model: a.model, usageMissing: !usageOf(a), actualAmount: a.cost, billingConfirmed: false })),
};
for (const values of [report.byBeijingDay, report.byCohort, report.byPurposeModel]) {
  assert.equal(values.reduce((n, r) => n + r.attempts, 0), rows.length);
}
writeFileSync(path.join(import.meta.dirname, "reconciliation.json"), JSON.stringify(report, null, 2) + "\n");
const columns = ["attemptId", "receiptId", "attempt", "startedAt", "beijingDay", "cohort", "purpose", "model", "status", "receiptStatusAtSnapshot", "inputTokens", "outputTokens", "cachedInputTokens", "actualAmount", "actualCurrency", "costBasis"];
const csv = [columns, ...rows.map(a => {
  const u = usageOf(a);
  return [a.id, a.receipt_id, a.attempt, a.started_at, dayOf(a.started_at), cohortOf(a), a.purpose, a.model,
    a.status, a.receipt_status, u?.input, u?.output, u?.cached, a.cost, a.currency, a.cost_basis];
})].map(row => row.map(v => v == null ? "" : `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n") + "\n";
writeFileSync(path.join(import.meta.dirname, "attempts.csv"), csv);
console.log(JSON.stringify({ total: report.total, days: report.byBeijingDay, retries: retries.length,
  extraSends: report.extraSendsObserved, repeatedArticleRevisions: repeated.length, output: report.currentRuleSnapshot }));
