import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { normalizeAnalysis, type AnalysisRun } from "../packages/backend/src/editorial/analyze.ts";

const imported = await import("../packages/backend/src/editorial/automatic-policy.ts").catch(() => null);
function policy() {
  assert.ok(imported, "the automatic policy module must exist");
  return imported;
}

const checks = {
  claimsComplete: true, chineseCopyFaithful: true, subject: true, numbers: true, units: true,
  time: true, chain: true, stage: true, attribution: true, noSpeculationAsFact: true, notMarketing: true,
};
const verification = () => ({
  verdict: "supported" as const, checks: { ...checks }, riskFlags: [] as string[], reason: "全部主张有原文支持",
  claims: [{ claim: "基金会宣布测试网将于10月启用", verdict: "supported" as const,
    evidence: [{ materialId: "original", exactQuote: "Foundation announced a testnet launch planned for October." }], reason: "声明保留归属与计划阶段" }],
});
const input = () => ({
  sourceAuthorized: true, sourceEnabled: true, bodyReadable: true, relevance: "PASS",
  copy: { titleZh: "基金会宣布测试网排期", summaryZh: "基金会宣布测试网计划10月启用。", reasonZh: null, category: "infrastructure" },
  scores: [90, 91], threshold: 60, verification: verification(), requiresPrimaryEvidence: false,
  materials: [{ id: "original", bodyText: "Foundation announced a testnet launch planned for October. Details follow.", primary: true }],
});

test("EDITORIAL_MODE defaults to manual and rejects any value outside manual|automatic", () => {
  for (const mode of [undefined, "manual", "automatic", "automaatic", "", "AUTOMATIC"]) {
    const env = { ...process.env };
    delete env.EDITORIAL_MODE;
    if (mode !== undefined) env.EDITORIAL_MODE = mode;
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", 'import {config} from "./packages/backend/src/config.ts"; console.log(config.editorialMode)'], { cwd: import.meta.dirname + "/..", env, encoding: "utf8" });
    if (mode === undefined || mode === "manual" || mode === "automatic") {
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), mode ?? "manual");
    } else {
      assert.notEqual(r.status, 0, `${mode} must fail closed`);
      assert.match(r.stderr, /EDITORIAL_MODE/);
    }
  }
});

test("automatic scores add a third only for two scores crossing the threshold or spread over 20", () => {
  for (const values of [[59, 61], [60, 81]]) assert.equal(policy().scoreAssessment(values, 60).needsAdditionalScore, true);
  for (const values of [[60, 80], [59, 59], [59, 61, 70], [60, 81, 90]]) assert.equal(policy().scoreAssessment(values, 60).needsAdditionalScore, false);
  assert.equal(policy().scoreAssessment([59, 61], 60, "manual").needsAdditionalScore, false);
});

test("automatic selection requires enough calls, every score above threshold and spread <=20", () => {
  assert.deepEqual(policy().scoreAssessment([60, 80], 60), { count: 2, min: 60, max: 80, mean: 70, stable: true, selected: true, needsAdditionalScore: false });
  for (const values of [[], [99], [59, 61], [59, 61, 90], [60, 81, 70], [60, 81]]) assert.equal(policy().scoreAssessment(values, 60).selected, false, JSON.stringify(values));
  assert.equal(policy().scoreAssessment([60, 80, 70], 60).selected, true);
  assert.equal(policy().scoreAssessment([90, 90], null).selected, false);
  assert.throws(() => policy().scoreAssessment([90, 90, 90, 90], 60), /scores/);
  for (const value of [NaN, 101, -1, 60.5]) assert.throws(() => policy().scoreAssessment([60, value], 60), /scores/);
});

test("manual scoring preserves exactly two calls and the unrounded mean threshold", () => {
  const result = policy().scoreAssessment([59, 61], 60, "manual");
  assert.equal(result.selected, true);
  assert.equal(result.mean, 60);
  assert.equal(policy().scoreAssessment([59, 60], 60, "manual").selected, false);
  assert.equal(policy().scoreAssessment([90, 90, 90], 60, "manual").selected, false);
});

test("complete supported Chinese copy is public; low attention affects selection only", () => {
  const good = policy().evaluateAutomaticPublication(input());
  assert.equal(good.public, true);
  assert.equal(good.selected, true);
  assert.deepEqual(good.reasons, []);
  const low = input(); low.scores = [20, 30];
  assert.equal(policy().evaluateAutomaticPublication(low).public, true);
  assert.equal(policy().evaluateAutomaticPublication(low).selected, false);
});

test("unscored source tiers and refused or incomplete scoring cannot become automatically public", () => {
  const unknownTier = { ...input(), threshold: null, scores: [] };
  assert.equal(policy().evaluateAutomaticPublication(unknownTier).public, false);
  assert.equal(policy().evaluateAutomaticPublication({ ...input(), threshold: null }).public, false);
  assert.equal(policy().evaluateAutomaticPublication({ ...input(), scoreRefused: true }).public, false);
  for (const scores of [[], [99], [59, 61]]) assert.equal(policy().evaluateAutomaticPublication({ ...input(), scores }).public, false);
});

test("primary evidence must support each core claim, and risk flags cannot loosen caller policy", () => {
  const bad = input(); bad.requiresPrimaryEvidence = true;
  bad.materials.push({ id: "secondary", bodyText: "A media source reports $10m losses.", primary: false });
  bad.verification.claims.push({ claim: "损失1000万美元", verdict: "supported", evidence: [{ materialId: "secondary", exactQuote: "A media source reports $10m losses." }], reason: "二手报道" });
  assert.equal(policy().evaluateAutomaticPublication(bad).public, false);
  const risk = input(); risk.materials[0]!.primary = false; risk.verification.riskFlags = ["loss_amount"];
  assert.equal(policy().evaluateAutomaticPublication(risk).public, false);
});

test("high scores cannot compensate for a forged quote or a fabricated material ID", () => {
  for (const evidence of [{ materialId: "original", exactQuote: "The mainnet upgrade completed in September." }, { materialId: "invented", exactQuote: "Foundation announced a testnet launch planned for October." }, { materialId: "original", exactQuote: " " }]) {
    const bad = input(); bad.verification.claims[0]!.evidence = [evidence];
    assert.equal(policy().evaluateAutomaticPublication(bad).public, false);
  }
});

test("quotes allow whitespace normalization but cannot be sourced from the wrong fetched body", () => {
  const good = input(); good.materials[0]!.bodyText = "Foundation\nannounced a testnet launch planned\tfor October.";
  assert.equal(policy().evaluateAutomaticPublication(good).public, true);
  good.materials = [{ id: "original", bodyText: "Other article", primary: true }, { id: "other", bodyText: input().materials[0]!.bodyText, primary: true }];
  assert.equal(policy().evaluateAutomaticPublication(good).public, false);
});

test("all core claims need support and verdict cannot hide missing or contradictory evidence", () => {
  for (const verdict of ["needs_evidence", "contradicted"] as const) {
    const bad = input(); bad.verification = { ...bad.verification, verdict } as never;
    assert.equal(policy().evaluateAutomaticPublication(bad).public, false);
    const claimBad = input(); claimBad.verification.claims[0]!.verdict = verdict as never;
    assert.equal(policy().evaluateAutomaticPublication(claimBad).public, false);
  }
  for (const mutate of [(x: ReturnType<typeof input>) => { x.verification.claims = []; }, (x: ReturnType<typeof input>) => { x.verification.claims[0]!.evidence = []; }]) {
    const bad = input(); mutate(bad); assert.equal(policy().evaluateAutomaticPublication(bad).public, false);
  }
});

test("all explicit faithfulness checks must pass, including coverage and number/unit/date/stage/attribution", () => {
  for (const key of Object.keys(checks) as Array<keyof typeof checks>) {
    const bad = input(); bad.verification.checks[key] = false;
    assert.equal(policy().evaluateAutomaticPublication(bad).public, false, key);
  }
  const bad = input(); delete (bad.verification.checks as Partial<typeof checks>).numbers;
  assert.equal(policy().evaluateAutomaticPublication(bad).public, false);
  assert.equal(policy().VerificationSchema.safeParse({ ...verification(), checks: { ...checks, numbers: "true" } }).success, false);
});

test("false checks deny publication without inventing a contradiction for missing or unknown evidence", () => {
  for (const verdict of ["supported", "needs_evidence"] as const) {
    for (const check of ["time", "numbers"] as const) {
      const result = policy().evaluateAutomaticPublication({
        ...input(), verification: { ...verification(), verdict, checks: { ...checks, [check]: false }, reason: "原文缺少日期或数字，无法确认" },
      });
      assert.equal(result.public, false);
      assert.equal(result.verificationVerdict, "needs_evidence", `${verdict} with unknown ${check} is not an explicit contradiction`);
    }
  }
});

test("an explicit overall or claim contradiction remains contradicted when checks are also false", () => {
  const overall = policy().evaluateAutomaticPublication({
    ...input(), verification: { ...verification(), verdict: "contradicted", checks: { ...checks, time: false } },
  });
  assert.equal(overall.public, false);
  assert.equal(overall.verificationVerdict, "contradicted");
  const v = verification();
  const claim = policy().evaluateAutomaticPublication({
    ...input(), verification: { ...v, checks: { ...checks, numbers: false }, claims: [{ ...v.claims[0]!, verdict: "contradicted" }] },
  });
  assert.equal(claim.public, false);
  assert.equal(claim.verificationVerdict, "contradicted");
});

test("caller primary-evidence policy cannot be bypassed by the model's self-report", () => {
  const bad = input(); bad.requiresPrimaryEvidence = true; bad.materials[0]!.primary = false;
  assert.equal(policy().evaluateAutomaticPublication(bad).public, false);
  bad.materials.push({ id: "primary", bodyText: input().materials[0]!.bodyText, primary: true });
  assert.equal(policy().evaluateAutomaticPublication(bad).public, false, "an unrelated primary material does not support the claim");
  bad.verification.claims[0]!.evidence = [{ materialId: "primary", exactQuote: input().verification.claims[0]!.evidence[0]!.exactQuote }];
  assert.equal(policy().evaluateAutomaticPublication(bad).public, true);
});

test("only enabled authorized sources with readable original, PASS, Chinese copy and category are public", () => {
  const mutations = [
    (x: ReturnType<typeof input>) => { x.sourceAuthorized = false; },
    (x: ReturnType<typeof input>) => { x.sourceEnabled = false; },
    (x: ReturnType<typeof input>) => { x.bodyReadable = false; },
    (x: ReturnType<typeof input>) => { x.relevance = "UNKNOWN"; },
    (x: ReturnType<typeof input>) => { x.copy.titleZh = " "; },
    (x: ReturnType<typeof input>) => { x.copy.summaryZh = "English only"; },
    (x: ReturnType<typeof input>) => { x.copy.reasonZh = "English rationale" as never; },
    (x: ReturnType<typeof input>) => { x.copy.category = ""; },
    (x: ReturnType<typeof input>) => { x.materials[0]!.bodyText = ""; },
  ];
  for (const mutate of mutations) { const bad = input(); mutate(bad); assert.equal(policy().evaluateAutomaticPublication(bad).public, false); }
  const noVerification = { ...input(), verification: null };
  assert.equal(policy().evaluateAutomaticPublication(noVerification).public, false);
  const insufficient = input(); insufficient.scores = [99];
  assert.equal(policy().evaluateAutomaticPublication(insufficient).public, false);
});

test("normalized analysis retains an observed score range and manual UNKNOWN behavior", () => {
  const run: AnalysisRun = {
    prefilter: { label: "UNKNOWN", reason: "", model: "default", receiptId: 1, reused: false },
    scores: { values: [59, 61, 80], threshold: 60, model: "default", receiptIds: [2, 3, 4], reused: false },
    writing: { kind: "understand", model: "default", titleZh: "中文标题", summaryZh: "中文摘要", reasonZh: null, tags: null, receiptIds: [5], reused: false },
    structure: null,
  };
  const automatic = normalizeAnalysis(run, "automatic");
  assert.equal(automatic.relevance, "unknown");
  assert.equal(automatic.score, 66);
  assert.deepEqual(automatic.scoreRange, { count: 3, min: 59, max: 80, mean: 200 / 3, stable: false });
  run.scores!.values = [59, 61];
  const manual = normalizeAnalysis(run, "manual");
  assert.equal(manual.relevance, "pass");
  assert.equal(manual.selected, true);
});
