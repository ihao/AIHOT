// Real scoring requests and receipts, with every model endpoint bound to a local HTTP stub.
import { stub, tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { config, type EditorialMode } from "../packages/backend/src/config.ts";
import { closeDb, sql } from "../packages/backend/src/db.ts";
import { runAnalysis, type AnalyzeInputArticle } from "../packages/backend/src/editorial/analyze.ts";
import { invalidateModelCache, modelFor } from "../packages/backend/src/editorial/models.ts";
import { chatJson, markReceiptsCompleted } from "../packages/backend/src/providers/llm.ts";
import { z } from "zod";

const T = tag();
const cases = [
  { marker: "AUTO_STABLE", mode: "automatic", answers: [60, 80], expected: [60, 80] },
  { marker: "AUTO_CROSS", mode: "automatic", answers: [59, 61, 90], expected: [59, 61, 90] },
  { marker: "AUTO_SPREAD", mode: "automatic", answers: [60, 81, 70], expected: [60, 81, 70] },
  { marker: "AUTO_LOW", mode: "automatic", answers: [20, 30], expected: [20, 30] },
  { marker: "MANUAL_CROSS", mode: "manual", answers: [59, 61, 90], expected: [59, 61] },
  { marker: "MANUAL_SPREAD", mode: "manual", answers: [60, 81, 70], expected: [60, 81] },
] satisfies Array<{ marker: string; mode: EditorialMode; answers: number[]; expected: number[] }>;
const calls: Array<{ marker: string; step: "prefilter" | "score" | "verify"; body: Record<string, any> }> = [];
const provider = await stub((hit, request) => {
  const body = JSON.parse(request.body) as Record<string, any>;
  const system = String(body.messages[0]?.content);
  const user = String(body.messages.at(-1)?.content);
  const scenario = cases.find((c) => user.includes(c.marker));
  const step = scenario ? system.includes("事件注意力评分器") ? "score" : "prefilter" : "verify";
  calls.push({ marker: scenario?.marker ?? "VERIFY_MAX", step, body });
  const index = calls.filter((c) => c.marker === scenario?.marker && c.step === "score").length - 1;
  const content = step === "score" ? { attentionScore: scenario!.answers[index] }
    : step === "prefilter" ? { label: "PASS", reason: "本机测试材料" } : { supported: true };
  return { id: `stub-${T}-${hit}`, choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } };
});
Object.assign(process.env, {
  LLM_BASE_URL: `${provider.url}/v1`, LLM_API_KEY: "test-local-key", LLM_MODEL: "qwen3.8-flash", LLM_EXTRA_JSON: '{"enable_thinking":false}',
  DASHSCOPE_BASE_URL: `${provider.url}/v1`, DASHSCOPE_API_KEY: "test-local-key", PREFILTER_MODEL: "default", SCORE_MODEL: "default", VERIFICATION_MODEL: "qwen3.8-max",
});
invalidateModelCache();
const previousMode = config.editorialMode;
const previousCalls = config.modelCallsEnabled;
const originalFetch = globalThis.fetch;
globalThis.fetch = (request, init) => {
  const url = new URL(typeof request === "string" ? request : request instanceof URL ? request.href : request.url);
  assert.equal(url.hostname, "127.0.0.1", "model integration tests may only reach the local stub");
  return originalFetch(request, init);
};
let savedBudgets: Array<{ service: string; per_minute: number; per_hour: number; per_day: number }> = [];
before(async () => {
  savedBudgets = await sql`SELECT service, per_minute, per_hour, per_day FROM budgets WHERE service IN ('llm', 'dashscope')`;
  await sql`UPDATE budgets SET per_minute = 1000, per_hour = 10000, per_day = 100000 WHERE service IN ('llm', 'dashscope')`;
});
config.modelCallsEnabled = true;
after(async () => {
  config.editorialMode = previousMode;
  config.modelCallsEnabled = previousCalls;
  globalThis.fetch = originalFetch;
  for (const b of savedBudgets) await sql`UPDATE budgets SET per_minute = ${b.per_minute}, per_hour = ${b.per_hour}, per_day = ${b.per_day} WHERE service = ${b.service}`;
  await provider.close();
  await closeDb();
});

for (const scenario of cases) test(`${scenario.mode} scoring ${scenario.marker} calls ${scenario.expected.length} times and never a fourth`, async () => {
  config.editorialMode = scenario.mode;
  const material: AnalyzeInputArticle = {
    id: `${scenario.marker}-${T}`, revision: 1, title: `${scenario.marker} protocol release ${T}`,
    url: `https://example.invalid/${scenario.marker}`, author: null, publishedAt: new Date("2026-09-30T00:00:00Z"),
    bodyText: `${scenario.marker}: A protocol released documented changes and activation details. ${T}`, excerpt: null, bodyStatus: "ok", xPost: null, media: [],
    source: { name: "Local scoring stub", kind: "rss", tier: "T1", firstParty: true },
  };
  const run = await runAnalysis(material, { stages: "selection", scoreModel: "default" });
  assert.deepEqual(run.scores!.values, scenario.expected);
  assert.equal(calls.filter((c) => c.marker === scenario.marker && c.step === "score").length, scenario.expected.length);
  assert.equal(run.scores!.receiptIds.length, scenario.expected.length);
  const hitCount = provider.hits();
  const replay = await runAnalysis(material, { stages: "selection", scoreModel: "default" });
  assert.equal(provider.hits(), hitCount, "recovery reuses all persisted receipts, including the third score");
  assert.deepEqual(replay.scores!.receiptIds, run.scores!.receiptIds);
  await markReceiptsCompleted([run.prefilter.receiptId, ...run.scores!.receiptIds]);
});

test("VERIFICATION_MODEL selects qwen3.8-max and its real stub request cannot silently fall back", async () => {
  const model = await modelFor("verification");
  assert.equal(model, "qwen3.8-max");
  const response = await chatJson({ model, purpose: "verify_summary", subject: `max-preset:${T}`, promptVersion: "stub-max-v1", system: "核验本机契约", user: `VERIFY_MAX ${T}`, schema: z.object({ supported: z.boolean() }) });
  const request = calls.find((c) => c.marker === "VERIFY_MAX")!;
  assert.equal(request.body.model, "qwen3.8-max");
  assert.equal(request.body.enable_thinking, false);
  assert.deepEqual(request.body.response_format, { type: "json_object" });
  assert.equal(response.data.supported, true);
  await markReceiptsCompleted([response.receiptId]);
});
