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

test("regional research without a chain claim can pass; an unsupported added chain remains denied", () => {
  const research = input();
  const quote = "Chainalysis reports regional adoption declined 6.8% from July 2025 to June 2026.";
  research.copy = { titleZh: "Chainalysis 报告区域采用情况", summaryZh: "Chainalysis 报告称，2025年7月至2026年6月区域采用指标下降6.8%。", reasonZh: null, category: "research" };
  research.materials = [{ id: "original", bodyText: quote, primary: true }];
  research.verification.claims = [{ claim: research.copy.summaryZh!, verdict: "supported", evidence: [{ materialId: "original", exactQuote: quote }], reason: "保留机构归属、指标与统计区间，文案未主张任何链" }];
  assert.equal(policy().evaluateAutomaticPublication(research).public, true, "a dimension absent from the copy has no claim conflict");
  for (const verdict of ["needs_evidence", "contradicted"] as const) {
    const unsupported = { ...research, copy: { ...research.copy, summaryZh: "Chainalysis 报告称，以太坊链采用指标下降6.8%。" },
      verification: { ...research.verification, verdict, checks: { ...checks, chain: false },
        claims: [{ ...research.verification.claims[0]!, claim: "以太坊链采用指标下降6.8%", verdict, reason: "材料未指明以太坊链，不能支持新增的链范围" }] } };
    const result = policy().evaluateAutomaticPublication(unsupported);
    assert.equal(result.public, false);
    assert.equal(result.verificationVerdict, verdict);
    assert.ok(result.reasons.includes("check_chain_failed"));
  }
  const falsePositive = { ...research, verification: { ...research.verification, checks: { ...checks, chain: false } } };
  assert.equal(policy().evaluateAutomaticPublication(falsePositive).public, false, "the caller must never automatically repair a model's false check");
});

test("evidence quotes preserve punctuation, case and Unicode quotation marks", () => {
  const original = 'The report calls it “Institutional Adoption”: 6.8%.';
  const exact = input();
  exact.copy = { titleZh: "报告披露机构采用指标", summaryZh: "报告将该指标称为“机构采用”，数值为6.8%。", reasonZh: null, category: "research" };
  exact.materials[0]!.bodyText = original;
  exact.verification.claims[0]!.claim = exact.copy.summaryZh!;
  exact.verification.claims[0]!.evidence = [{ materialId: "original", exactQuote: '“Institutional Adoption”: 6.8%' }];
  assert.equal(policy().evaluateAutomaticPublication(exact).public, true);
  for (const quote of ['"Institutional Adoption": 6.8%', '“institutional Adoption”: 6.8%', '“Institutional Adoption” 6.8%', '“Institutional Adoption”: approximately 6.8%']) {
    exact.verification.claims[0]!.evidence[0]!.exactQuote = quote;
    const result = policy().evaluateAutomaticPublication(exact);
    assert.equal(result.public, false, quote);
    assert.ok(result.reasons.includes("claim_0_quote_invalid"));
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

test('explicit claim scope does not make unrelated research or background facts primary',()=>{
 const research=input();research.materials[0]!.primary=false;
 const v={...research.verification,claims:research.verification.claims.map(c=>({...c,riskFlags:[]}))};
 assert.equal(policy().evaluateAutomaticPublication({...research,requiresPrimaryEvidence:true,primaryEvidenceScope:'claims',verification:v}).public,true);
 assert.equal(policy().evaluateAutomaticPublication({...research,requiresPrimaryEvidence:true,primaryEvidenceScope:'claims'}).public,false,'omitted flags keep legacy strict fallback');
 assert.equal(policy().evaluateAutomaticPublication({...research,requiresPrimaryEvidence:true,verification:v}).public,false,'old boolean caller stays strict');
});
test('empty model flags cannot bypass critical copy or claim facts',()=>{
 for(const claim of ['协议已确认遭受攻击','协议损失100万美元','SEC 正式起诉交易所','治理提案已在链上执行']){
  const bad=input();bad.materials[0]!.primary=false;bad.copy.titleZh=claim;bad.verification.claims[0]!.claim=claim;
  const v={...bad.verification,claims:bad.verification.claims.map(c=>({...c,riskFlags:[]}))};
  assert.equal(policy().evaluateAutomaticPublication({...bad,primaryEvidenceScope:'claims',verification:v}).public,false,claim);
 }
 const v=verification();assert.equal(policy().VerificationSchema.safeParse({...v,claims:v.claims.map(c=>({...c,riskFlags:['invented_risk']}))}).success,false);
});
test('quoteId resolves actual paragraph in its material and unknown or swapped identifiers fail',()=>{
 const good=input();good.materials[0]!.bodyText='First “exact” paragraph.\n\nSecond paragraph.';
 const v={...good.verification,claims:[{...good.verification.claims[0]!,evidence:[{materialId:'original',quoteId:'original:p1'}]}]};
 assert.equal(policy().evaluateAutomaticPublication({...good,verification:v}).public,true);
 for(const e of [{materialId:'original',quoteId:'original:p3'},{materialId:'other',quoteId:'original:p1'},{materialId:'original',quoteId:'original:p1',exactQuote:'changed'}]){
  assert.equal(policy().evaluateAutomaticPublication({...good,verification:{...v,claims:[{...v.claims[0]!,evidence:[e]}]}}).public,false);
 }
});
test('rewritten copy requires an explicit immutable core preservation check',()=>{
 for(const coreEventPreserved of [undefined,false]){
  const v={...verification(),checks:{...checks,coreEventPreserved}};
  assert.equal(policy().evaluateAutomaticPublication({...input(),rewritten:true,verification:v}).public,false);
 }
 assert.equal(policy().evaluateAutomaticPublication({...input(),rewritten:true,verification:{...verification(),checks:{...checks,coreEventPreserved:true}}}).public,true);
});
test('deterministic critical copy still requires primary under omitted legacy claim flags',()=>{
 const bad=input();bad.materials[0]!.primary=false;bad.copy.titleZh='SEC 正式起诉交易所';bad.verification.claims[0]!.claim=bad.copy.titleZh;
 const result=policy().evaluateAutomaticPublication(bad);assert.equal(result.public,false);assert.ok(result.reasons.includes('claim_0_primary_evidence_missing'));
});
test('formal regulator proposals and actual governance completion remain primary with empty flags',()=>{
 for(const claim of ['SEC提出加密资产托管规则提案','SEC发布拟议规则','安全理事会执行了提案','治理升级已完成']){
  const bad=input();bad.materials[0]!.primary=false;bad.copy.titleZh=claim;bad.verification.claims[0]!.claim=claim;
  const v={...bad.verification,claims:bad.verification.claims.map(c=>({...c,riskFlags:[]}))};
  const result=policy().evaluateAutomaticPublication({...bad,primaryEvidenceScope:'claims',verification:v});
  assert.equal(result.public,false,claim);assert.ok(result.reasons.includes('claim_0_primary_evidence_missing'),claim);
 }
});
test('legacy omitted claim flags retain semantically equivalent primary supported claims',()=>{
 const good=input();good.copy.titleZh='SEC正式起诉交易所';good.copy.summaryZh='SEC正式起诉交易所。';
 good.verification.claims[0]!.claim='美国证券交易委员会对交易所提起诉讼';
 assert.equal(policy().evaluateAutomaticPublication({...good,primaryEvidenceScope:'claims'}).public,true);
 good.materials[0]!.primary=false;assert.equal(policy().evaluateAutomaticPublication({...good,primaryEvidenceScope:'claims'}).public,false);
});
test('reader-facing recommendation critical facts require primary even outside title and summary',()=>{
 const initial=input();
 const bad={...initial,copy:{...initial.copy,reasonZh:'SEC发布拟议规则，将影响托管要求。'}};bad.materials[0]!.primary=false;
 bad.verification.claims.push({...bad.verification.claims[0]!,claim:bad.copy.reasonZh!});
 const v={...bad.verification,claims:bad.verification.claims.map(c=>({...c,riskFlags:[]}))};
 assert.equal(policy().evaluateAutomaticPublication({...bad,primaryEvidenceScope:'claims',verification:v}).public,false);
 // Legacy response paraphrases the claim and omits flags, so actual reason must activate strict fallback.
 bad.verification.claims[1]!.claim='美国证券交易委员会公布关于托管要求的规则草案';
 assert.equal(policy().evaluateAutomaticPublication({...bad,primaryEvidenceScope:'claims'}).public,false);
});
test('deterministic Chinese aliases reverse losses vulnerabilities and rule adoption cannot use secondary proof',()=>{
 for(const claim of ['美国证券交易委员会正式起诉交易所','协议造成三千万元损失','安全漏洞已被确认','CFTC通过新的监管规则']){
  const bad=input();bad.copy.titleZh=claim;bad.copy.summaryZh=claim+'。';bad.materials[0]!.primary=false;bad.verification.claims[0]!.claim=claim;
  const v={...bad.verification,claims:bad.verification.claims.map(c=>({...c,riskFlags:[]}))};
  const result=policy().evaluateAutomaticPublication({...bad,requiresPrimaryEvidence:true,primaryEvidenceScope:'claims',verification:v});
  assert.equal(result.public,false,claim);assert.ok(result.reasons.includes('claim_0_primary_evidence_missing'),claim);
 }
});
test('formal recruiting and CEO wording around a regulator is still ordinary background',()=>{
 for(const claim of ['SEC正式招聘监管研究员','前SEC官员正式担任该公司CEO']){
  const good=input();good.copy.titleZh=claim;good.copy.summaryZh=claim+'。';good.materials[0]!.primary=false;good.verification.claims[0]!.claim=claim;
  const v={...good.verification,claims:good.verification.claims.map(c=>({...c,riskFlags:[]}))};
  assert.equal(policy().evaluateAutomaticPublication({...good,requiresPrimaryEvidence:true,primaryEvidenceScope:'claims',verification:v}).public,true,claim);
 }
});
