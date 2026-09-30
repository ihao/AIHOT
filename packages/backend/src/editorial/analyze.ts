// analyzeArticle: the judging and writing steps, each with its own prompt from the industry pack
// (industry/prompts/):
//   1. prefilter: does the material belong to this industry at all (wide recall). Only BLOCK stops an
//      item; UNKNOWN goes on like PASS (a BLOCK given while material is missing counts as UNKNOWN);
//   2. score: two independent scores against the source tier's threshold (industry/selection.ts);
//      automatic mode adds a third for threshold-crossing or divergent scores;
//   3. writing: the Chinese title, summary and reason by the content understanding for selected and
//      near-selected items, by the cheaper title/summary prompts for the rest;
//   4. structure (no reader-facing text): category, tags, subject companies and the fact frame the
//      topics and the event grouping need; it runs beside the scoring.
// Material with only a title or a feed summary has its article page fetched before it is judged.
import { z } from "zod";
import { CATEGORY_KEYS } from "@aihot/contracts/taxonomy";
import { CATEGORIES } from "@aihot/industry/taxonomy";
import { SELECTION } from "@aihot/industry/selection";
import { sql, type Tx } from "../db.ts";
import { sha256, stableJson } from "../lib/ids.ts";
import { config, type EditorialMode } from "../config.ts";
import { scoreAssessment } from "./automatic-policy.ts";
import { publishArticleTx } from "../publication/publish.ts";
import { AUTOMATIC_RULE_VERSION, queueAutomaticVerificationTx } from "./automatic-verification.ts";
import { considerAutoPublicationTx } from "./auto-publication.ts";
import { chatJson, MODELS, type ContentPart } from "../providers/llm.ts";
import { completeReceipt, ProviderRejectedError } from "../providers/receipts.ts";
import { collapseWhitespace } from "../lib/text.ts";
import { modelFor } from "./models.ts";
import { buildMaterial, firstImagePart, loadAnalyzeInput, type AnalyzeInputArticle } from "./input.ts";
import { pageFetchable } from "../content/extract.ts";
import { shutdownSignal } from "../jobs/queue.ts";
import {
  buildArticlePrompt, buildLongTweetPrompt, buildShortTweetPrompt, finalizeCopy, isShortTweetInput, looksZh, MAX_BODY_CHARS, missingEvidence,
  needsShortTweetTranslation, parseTranslateOutput, PREFILTER_SYSTEM, prefilterUser, translateInputOf, UNDERSTAND_SYSTEM, understandUser,
  type IdentityGuard,
} from "./writing.ts";
import { CATEGORY_BY_ITEM_TYPE, CATEGORY_GUIDE, CATEGORY_TAGS, ENTITIES, ENTITY_TAGS, ITEM_TYPES, normalizeTags, TOPIC_TAGS } from "./vocabulary.ts";
import { promptText, promptVersion } from "./prompts.ts";

export { buildMaterial, loadAnalyzeInput, type AnalyzeInputArticle };

export const PROMPT_VERSIONS = {
  prefilter: promptVersion("prefilter"),
  score: promptVersion("selection-score"),
  understand: promptVersion("understand"),
  summarize: promptVersion("summarize-article", "summarize-article-empty", "summarize-short-post", "summarize-short-post-quoted", "summarize-long-post", "summarize-long-post-quoted", "identity-context"),
  structure: promptVersion("structure"),
  verification: promptVersion("verify-summary"),
} as const;
/** Every step's prompt, as stored on each judgement. */
export const ANALYZE_PROMPT_VERSION = Object.values(PROMPT_VERSIONS).join("+");

// ── Scoring ───────────────────────────────────────────────────────────────────────────────

/** Initial independent score calls per article; automatic mode may append exactly one. */
export const SCORE_CALLS = 2;

/**
 * The thresholds on the mean score, per source tier (industry/selection.ts): selected when
 * score1 + score2 >= 2 × threshold. Tiers without a threshold are not scored for 精选.
 */
export function tierThreshold(tier: string): number | null {
  return SELECTION.thresholds[tier] ?? null;
}

/** Unselected items above this mean are written like selected ones. */
export const UNDERSTAND_FLOOR = SELECTION.understandFloor;

/**
 * Call parameters per score model. The GLM scorer runs at temperature 1 with high reasoning (the model
 * registry adds top_p and thinking) and up to 180 s per call.
 */
const SCORE_CALL: Record<string, { temperature: number; maxTokens: number; timeoutMs: number }> = {
  "glm-5.3-flash-selection": { temperature: 1, maxTokens: 65_536, timeoutMs: 180_000 },
};
const scoreCall = (model: string) => SCORE_CALL[model] ?? { temperature: 0.2, maxTokens: 1024, timeoutMs: 120_000 };

/** The score prompt: the industry's taste (industry/prompts/selection-score.md). */
export const SCORE_SYSTEM = promptText("selection-score");

export const ScoreSchema = z.object({ attentionScore: z.coerce.number().int().min(0).max(100) });

const SCORE_TIME = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

/** The score input's time: Beijing time, ISO 8601 with +08:00 (the form the prompt was tuned on). */
export function scoreInputTime(at: Date): string {
  const ms = at.getTime() % 1000;
  return `${SCORE_TIME.format(at).replace(" ", "T")}${ms ? `.${String(ms).padStart(3, "0")}` : ""}+08:00`;
}

/**
 * The score input: no source facts (the prompt forbids guessing them), the publication time, the
 * original title (items are scored before any Chinese copy exists) and the whole body.
 */
export function buildScoreInput(a: AnalyzeInputArticle): string {
  let body: string;
  if (a.xPost) {
    const quoted = a.xPost.quoted?.text ? `\n\n[引用 ${a.xPost.quoted.handle ? `@${a.xPost.quoted.handle}` : "原推文"}]：${a.xPost.quoted.text}` : "";
    body = `${String(a.xPost.text ?? "").trim()}${quoted}`.trim();
  } else {
    body = (a.bodyText ?? a.excerpt ?? "").trim();
  }
  if (!body) body = a.title;
  const at = a.publishedAt ?? a.discoveredAt ?? null;
  return [
    "请按系统规则评估以下单篇材料所代表的事件。只输出 attentionScore。",
    `【发布时间（北京时间）】\n${at ? scoreInputTime(at) : ""}`,
    `【标题】\n${a.title.trim()}`,
    `【完整正文】\n${body.length > MAX_BODY_CHARS ? body.slice(0, MAX_BODY_CHARS) : body}`,
  ].join("\n\n");
}

// ── Step outputs ──────────────────────────────────────────────────────────────────────────

const PrefilterSchema = z.object({
  label: z.preprocess((v) => String(v ?? "").trim().toUpperCase(), z.enum(["PASS", "BLOCK", "UNKNOWN"])),
  reason: z.string().max(200).catch(""),
});

const FactSchema = z
  .object({
    title: z.string().max(80),
    subject: z.string().max(80).nullable().optional(),
    action: z.string().max(80).nullable().optional(),
    object: z.string().max(160).nullable().optional(),
    occurredAt: z.string().nullable().optional(),
  })
  .nullable()
  .catch(null);

const StructureSchema = z.object({
  category: z.enum(CATEGORY_KEYS).nullable().catch(null),
  tags: z.array(z.string()).max(12).catch([]),
  subjects: z.array(z.string()).max(6).catch([]),
  fact: FactSchema,
});

const UnderstandSchema = z.object({
  itemType: z.enum(ITEM_TYPES),
  authorRole: z.enum(["principal", "observer", "relayer"]).catch("relayer"),
  tags: z.array(z.string()).max(12).catch([]),
  editorialJudgment: z.string().max(400).catch(""),
  titleZh: z.string().trim().min(1).max(200),
  summaryZh: z.string().trim().min(1).max(4000),
});

const SummarizeSchema = z.object({ titleZh: z.string(), summaryZh: z.string(), bodyZh: z.string() });

const ZH_COUNT = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

/** The structure step's prompt (it writes nothing a reader sees), filled from the pack's vocabulary. */
const STRUCTURE_SYSTEM = promptText("structure", {
  categoryCount: ZH_COUNT[CATEGORIES.length] ?? String(CATEGORIES.length),
  categoryGuide: CATEGORY_GUIDE,
  categoryTags: CATEGORY_TAGS.join("、"),
  topicTags: TOPIC_TAGS.join("、"),
  entityTags: ENTITY_TAGS.join("、"),
  entities: Object.entries(ENTITIES).map(([id, e]) => `${id}（${e.aliases.slice(0, 3).join("/")}）`).join("，"),
});

export interface AnalysisRun {
  prefilter: { label: "PASS" | "BLOCK" | "UNKNOWN"; reason: string; model: string; receiptId: number; reused: boolean };
  /**
   * The independent score calls and the tier threshold they are held against; absent when the material
   * is not scored. `refused`: the model's content filter declined it, so it is not selected.
   */
  scores: { model: string; threshold: number; values: number[]; receiptIds: number[]; reused: boolean; refused?: boolean } | null;
  /** The reader-facing copy: `understand` (selected, near-selected), `summarize`, `verbatim` (a Chinese short post), `none`. */
  writing: {
    kind: "understand" | "summarize" | "verbatim" | "none";
    model: string | null;
    titleZh: string;
    summaryZh: string;
    reasonZh: string | null;
    tags: string[] | null;
    itemType?: string;
    authorRole?: string;
    identityGuard?: IdentityGuard;
    receiptIds: number[];
    reused: boolean;
  } | null;
  structure: { model: string; category: string | null; tags: string[]; subjects: string[]; fact: z.infer<typeof FactSchema>; receiptId: number; reused: boolean } | null;
}

const isContentFilter = (error: unknown) => error instanceof ProviderRejectedError && !error.retryable && /contentFilter|"1301"/.test(error.message);

/** Only a title or a feed summary, and a page to fetch: the article is judged on the page. */
export function waitsForPage(a: AnalyzeInputArticle): boolean {
  return a.bodyStatus === "pending" && !a.bodyText && !a.xPost && pageFetchable(a.url, a.source.kind);
}

type StepOpts = { attemptTag?: string; scoreModel?: string };
export class AnalysisInterruptedError extends Error {}

function checkAnalysisRunning() {
  if (shutdownSignal.signal.aborted) throw new AnalysisInterruptedError("worker shutting down between analysis stages");
}

const subjectOf = (a: AnalyzeInputArticle) => `article:${a.id}@${a.revision}`;
const tagged = (attemptTag: string | undefined, step: string) => [attemptTag, step].filter(Boolean).join(":") || undefined;

async function runPrefilter(a: AnalyzeInputArticle, opts: StepOpts): Promise<AnalysisRun["prefilter"]> {
  const model = await modelFor("prefilter");
  checkAnalysisRunning();
  const res = await chatJson({
    model,
    purpose: "prefilter_article",
    subject: subjectOf(a),
    promptVersion: PROMPT_VERSIONS.prefilter,
    system: PREFILTER_SYSTEM,
    user: prefilterUser(a),
    schema: PrefilterSchema,
    temperature: 0,
    maxTokens: 512,
    attemptTag: opts.attemptTag,
  });
  // A BLOCK without material to back it counts as UNKNOWN (which goes on).
  const label = res.data.label === "BLOCK" && missingEvidence(a) ? "UNKNOWN" : res.data.label;
  return { label, reason: res.data.reason, model: res.model, receiptId: res.receiptId, reused: res.reused };
}

async function runScores(a: AnalyzeInputArticle, threshold: number, opts: StepOpts): Promise<NonNullable<AnalysisRun["scores"]>> {
  const model = opts.scoreModel ?? (await modelFor("score"));
  const call = scoreCall(model);
  const input = buildScoreInput(a);
  const values: number[] = [];
  const receiptIds: number[] = [];
  let reused = true;
  // One after the other: the second call reuses the provider's cached prompt.
  for (let i = 0; i < SCORE_CALLS || scoreAssessment(values, threshold, config.editorialMode).needsAdditionalScore; i++) {
    checkAnalysisRunning();
    try {
      const res = await chatJson({
        model, purpose: "score_article", subject: subjectOf(a), promptVersion: PROMPT_VERSIONS.score, system: SCORE_SYSTEM, user: input,
        schema: ScoreSchema, temperature: call.temperature, maxTokens: call.maxTokens, timeoutMs: call.timeoutMs,
        // Each call is its own paid request; an explicit re-evaluation gets new ones.
        attemptTag: tagged(opts.attemptTag, `score-${i + 1}`),
      });
      values.push(res.data.attentionScore);
      receiptIds.push(res.receiptId);
      reused &&= res.reused;
    } catch (error) {
      // The model's content filter declines the material (Zhipu 1301): not scored, so not selected.
      if (isContentFilter(error)) return { model, threshold, values, receiptIds, reused: false, refused: true };
      throw error;
    }
  }
  return { model, threshold, values, receiptIds, reused };
}

async function runStructure(a: AnalyzeInputArticle, opts: StepOpts): Promise<NonNullable<AnalysisRun["structure"]>> {
  const model = await modelFor("structure");
  checkAnalysisRunning();
  const res = await chatJson({
    model,
    purpose: "structure_article",
    subject: subjectOf(a),
    promptVersion: PROMPT_VERSIONS.structure,
    system: STRUCTURE_SYSTEM,
    user: buildMaterial(a),
    schema: StructureSchema,
    temperature: 0.2,
    maxTokens: 800,
    attemptTag: tagged(opts.attemptTag, "structure"),
  });
  const subjects = [...new Set(res.data.subjects.map((s) => s.trim().toLowerCase()).filter((s) => s in ENTITIES))];
  return { model: res.model, category: res.data.category, tags: normalizeTags(res.data.tags), subjects, fact: res.data.fact, receiptId: res.receiptId, reused: res.reused };
}

/** The content understanding; null when the model's content filter declines the material. */
async function runUnderstand(a: AnalyzeInputArticle, opts: StepOpts): Promise<AnalysisRun["writing"]> {
  const model = await modelFor("understand");
  const text = understandUser(a);
  const call = (image: ContentPart | null) => {
    checkAnalysisRunning();
    return chatJson({
      model, purpose: "understand_article", subject: subjectOf(a), promptVersion: PROMPT_VERSIONS.understand, system: UNDERSTAND_SYSTEM,
      user: image ? [{ type: "text", text }, image] : text, schema: UnderstandSchema, temperature: 0.2, maxTokens: 16_384,
      timeoutMs: 180_000, attemptTag: tagged(opts.attemptTag, "understand"),
    });
  };
  // A model that is known not to read images gets the text only.
  const image = MODELS[model]?.vision === false ? null : await firstImagePart(a);
  let res: Awaited<ReturnType<typeof call>>;
  try {
    res = await call(image);
  } catch (error) {
    if (isContentFilter(error)) return null;
    // The model refused the image (download, format): the text is written without it.
    if (!image || !(error instanceof ProviderRejectedError) || error.retryable) throw error;
    try {
      res = await call(null);
    } catch (retryError) {
      if (isContentFilter(retryError)) return null;
      throw retryError;
    }
  }
  const d = res.data;
  const copy = finalizeCopy(translateInputOf(a), { titleZh: d.titleZh, summaryZh: d.summaryZh });
  return {
    kind: "understand", model: res.model, titleZh: copy.titleZh, summaryZh: copy.summaryZh, reasonZh: d.editorialJudgment.trim() || null,
    tags: normalizeTags(d.tags, { fallbackCategory: CATEGORY_BY_ITEM_TYPE[d.itemType] }), itemType: d.itemType, authorRole: d.authorRole,
    identityGuard: copy.identityGuard, receiptIds: [res.receiptId], reused: res.reused,
  };
}

/** The title/summary prompts (articles, long and short posts). */
async function runSummarize(a: AnalyzeInputArticle, opts: StepOpts): Promise<NonNullable<AnalysisRun["writing"]>> {
  const t = translateInputOf(a);
  const isX = t.sourceKind === "x_search";
  const short = isShortTweetInput(t);
  const main = collapseWhitespace(t.mainText || t.title);
  const plain = { reasonZh: null, tags: null, receiptIds: [] as number[], reused: true };
  // A short post already in Chinese is its own copy, and too little text is not written up from a title.
  if (short && !needsShortTweetTranslation(main)) return { kind: "verbatim", model: null, titleZh: main, summaryZh: main, ...plain };
  if (!short && t.text.trim().length < 20) return { kind: "none", model: null, titleZh: looksZh(t.title) ? t.title : "", summaryZh: "", ...plain };
  const model = await modelFor("summarize");
  checkAnalysisRunning();
  const res = await chatJson({
    model,
    purpose: "summarize_article",
    subject: subjectOf(a),
    promptVersion: PROMPT_VERSIONS.summarize,
    system: "",
    user: short ? buildShortTweetPrompt(t) : isX ? buildLongTweetPrompt(t) : buildArticlePrompt(t),
    schema: SummarizeSchema,
    json: false,
    parse: parseTranslateOutput,
    temperature: 0.2,
    maxTokens: 2048,
    attemptTag: tagged(opts.attemptTag, "summarize"),
  });
  const p = res.data;
  const draft = short
    ? { titleZh: p.titleZh || (looksZh(main) ? main : ""), summaryZh: p.bodyZh || p.summaryZh }
    : isX
      ? { titleZh: p.titleZh, summaryZh: p.summaryZh || p.bodyZh }
      : { titleZh: p.titleZh || (looksZh(t.title) ? t.title : ""), summaryZh: p.summaryZh };
  const copy = finalizeCopy(t, draft);
  return { kind: "summarize", model: res.model, titleZh: copy.titleZh, summaryZh: copy.summaryZh, reasonZh: null, tags: null, identityGuard: copy.identityGuard, receiptIds: [res.receiptId], reused: res.reused };
}

/**
 * Runs the steps on the material as it is (or reuses their receipts) without writing business results.
 * `stages: "selection"` stops after the scores (SelectBench).
 */
export async function runAnalysis(a: AnalyzeInputArticle, opts: StepOpts & { stages?: "selection" | "all" } = {}): Promise<AnalysisRun> {
  checkAnalysisRunning();
  const prefilter = await runPrefilter(a, opts);
  // UNKNOWN is let through (its material is as complete as it will get); BLOCK stops here.
  if (prefilter.label === "BLOCK") return { prefilter, scores: null, writing: null, structure: null };
  const threshold = tierThreshold(a.source.tier);
  if (opts.stages === "selection") {
    const scores = threshold === null ? null : await runScores(a, threshold, opts);
    return { prefilter, scores, writing: null, structure: null };
  }
  // The structure step needs nothing from the scores: it runs beside them.
  const structure = runStructure(a, opts).then((value) => ({ value }), (error: unknown) => ({ error }));
  try {
    const scores = threshold === null ? null : await runScores(a, threshold, opts);
    const assessment = scores && !scores.refused ? scoreAssessment(scores.values, scores.threshold, config.editorialMode) : null;
    const near = assessment?.mean !== null && assessment?.mean !== undefined && (assessment.mean >= scores!.threshold || assessment.mean > UNDERSTAND_FLOOR);
    const writing = (near ? await runUnderstand(a, opts) : null) ?? (await runSummarize(a, opts));
    const s = await structure;
    if ("error" in s) throw s.error;
    return { prefilter, scores, writing, structure: s.value };
  } finally {
    // A score/writing error or deploy must not let the job finish while a paid structure request
    // still owns a response. It settles and stores its receipt before shutdown can close the DB.
    await structure;
  }
}

/** One judgement from the steps: the selection rule, the reader-facing copy and the structure. */
export function normalizeAnalysis(run: AnalysisRun, mode: EditorialMode = config.editorialMode) {
  const label = run.prefilter.label;
  const titleZh = collapseWhitespace(run.writing?.titleZh ?? "");
  const summaryZh = (run.writing?.summaryZh ?? "").trim();
  // Past the prefilter (PASS or UNKNOWN) an item is relevant, but without a usable Chinese title and
  // summary it cannot be published: it waits.
  const relevance = label === "BLOCK" ? "block" : (mode === "automatic" && label !== "PASS") || run.writing && (!titleZh || !summaryZh) ? "unknown" : "pass";
  // The unrounded mean decides manual selection; automatic selection requires every score
  // at the threshold with limited variation. This observed range is not a confidence interval.
  const values = run.scores && !run.scores.refused ? run.scores.values : null;
  const threshold = run.scores?.threshold ?? null;
  const assessment = scoreAssessment(values ?? [], threshold, mode);
  const sufficient = mode === "manual" ? assessment.count === SCORE_CALLS : assessment.count >= SCORE_CALLS;
  const score = sufficient && assessment.mean !== null ? Math.floor(assessment.mean) : null;
  const selected = relevance === "pass" && assessment.selected;
  const subjects = run.structure?.subjects ?? [];
  const tags = [...(run.writing?.tags ?? run.structure?.tags ?? [])];
  for (const s of subjects) {
    const display = ENTITIES[s]?.displayTag;
    if (display && !tags.includes(display)) tags.push(display);
  }
  return {
    relevance,
    selected,
    score,
    scores: values,
    scoreRange: { count: assessment.count, min: assessment.min, max: assessment.max, mean: assessment.mean, stable: assessment.stable },
    scoreModel: run.scores?.model ?? null,
    scoreRefused: run.scores?.refused ?? false,
    threshold,
    category: run.structure?.category ?? null,
    tags,
    subjects,
    titleZh,
    summaryZh,
    reasonZh: run.writing?.reasonZh ?? null,
    fact: run.structure?.fact ?? null,
  };
}

export interface AnalyzeResult {
  analysisId: number | null;
  stale: boolean;
  /** The article page is to be fetched first; nothing was committed. */
  needsBody?: boolean;
  output: ReturnType<typeof normalizeAnalysis> | null;
  receiptIds: number[];
  reused: boolean;
}

type NormalizedAnalysis = ReturnType<typeof normalizeAnalysis>;
interface ReplayRow {
  id: number; input_revision: number; origin: string; model: string; prompt_version: string; receipt_ids: number[];
  relevance: string; category: string | null; tags: string[]; subjects: string[];
  title_zh: string | null; summary_zh: string | null; reason_zh: string | null; score: number | null; selected: boolean;
  output: Record<string, unknown>; rewritten: boolean | null;
  original_copy: { titleZh: string | null; summaryZh: string | null; reasonZh: string | null; category: string | null } | null;
  final_copy: ReplayRow['original_copy'];
}

/** Only non-secret model configuration participates in the automatic replay identity. */
async function replayModelConfiguration(opts: StepOpts) {
  const capabilities = ['prefilter', 'score', 'understand', 'summarize', 'structure'] as const;
  return Promise.all(capabilities.map(async capability => {
    const key = capability === 'score' && opts.scoreModel ? opts.scoreModel : await modelFor(capability);
    const spec = MODELS[key];
    return { capability, key, model: spec?.model, service: spec?.service, extra: spec?.extra ?? null,
      jsonMode: spec?.jsonMode, vision: spec?.vision, ...(capability === 'score' ? { call: scoreCall(key) } : {}) };
  }));
}
const replayInputHash = (input: AnalyzeInputArticle, models: unknown) => sha256(stableJson({
  input, models, mode: 'automatic', rule: AUTOMATIC_RULE_VERSION, prompts: ANALYZE_PROMPT_VERSION,
}));
function analysisResultHash(model: string, receiptIds: number[], out: NormalizedAnalysis, detail: Record<string, unknown>) {
  return sha256(stableJson({ model, prompt: ANALYZE_PROMPT_VERSION, receiptIds, detail,
    relevance: out.relevance, category: out.category, tags: out.tags, subjects: out.subjects,
    titleZh: out.titleZh, summaryZh: out.summaryZh, reasonZh: out.reasonZh, score: out.score, selected: out.selected }));
}
/** Called under the article lock both before paid work and at commit (concurrent replay). */
async function reusableAutomaticAnalysis(tx: Tx, articleId: string, revision: number, inputHash: string, expectedResultHash?: string): Promise<AnalyzeResult | null> {
  const [r] = await tx<ReplayRow[]>`SELECT an.*,av.rewritten,av.original_copy,av.final_copy FROM
    (SELECT * FROM analyses WHERE article_id=${articleId} ORDER BY id DESC LIMIT 1) an
    LEFT JOIN automatic_verifications av ON av.analysis_id=an.id AND av.automatic_rule_version=${AUTOMATIC_RULE_VERSION}`;
  const replay = r?.output.automaticReplay as { inputHash?: string; resultHash?: string; receiptHash?: string } | undefined;
  if (!r || r.origin !== 'model' || r.input_revision !== revision || r.prompt_version !== ANALYZE_PROMPT_VERSION || replay?.inputHash !== inputHash || !r.receipt_ids.length) return null;
  const currentCopy = { titleZh: r.title_zh, summaryZh: r.summary_zh, reasonZh: r.reason_zh, category: r.category };
  // A verifier's rewrite is the final copy; raw receipt replay must never replace it.
  if (r.rewritten && stableJson(currentCopy) !== stableJson(r.final_copy)) return null;
  const rawCopy = r.rewritten ? r.original_copy : currentCopy;
  if (!rawCopy) return null;
  const out: NormalizedAnalysis = {
    relevance: r.relevance, category: rawCopy.category, titleZh: rawCopy.titleZh ?? '', summaryZh: rawCopy.summaryZh ?? '', reasonZh: rawCopy.reasonZh,
    tags: r.tags, subjects: r.subjects, score: r.score, selected: r.selected,
    scores: (r.output.scores ?? null) as NormalizedAnalysis['scores'], scoreRange: r.output.scoreRange as NormalizedAnalysis['scoreRange'],
    scoreModel: (r.output.scoreModel ?? null) as string | null, scoreRefused: r.output.scoreRefused === true,
    threshold: (r.output.threshold ?? null) as number | null, fact: (r.output.fact ?? null) as NormalizedAnalysis['fact'],
  };
  const { automaticReplay: _identity, ...detail } = r.output;
  if (replay.resultHash !== analysisResultHash(r.model, r.receipt_ids, out, detail) || expectedResultHash && replay.resultHash !== expectedResultHash) return null;
  const receipts = await tx`SELECT id,logical_key,response FROM receipts WHERE id=ANY(${r.receipt_ids}) AND status='completed' ORDER BY id`;
  if (receipts.length !== new Set(r.receipt_ids).size || replay.receiptHash !== sha256(stableJson(receipts))) return null;
  return { analysisId: r.id, stale: false, receiptIds: r.receipt_ids, reused: true,
    output: { ...out, ...currentCopy, titleZh: currentCopy.titleZh ?? '', summaryZh: currentCopy.summaryZh ?? '' } };
}

/**
 * Analyses the current revision and commits the judgement. A result computed for an older revision
 * is kept for traceability but never overwrites a newer input (stale = true).
 */
export async function analyzeArticle(articleId: string, opts: StepOpts = {}): Promise<AnalyzeResult | null> {
  const input = await loadAnalyzeInput(articleId);
  if (!input) return null;
  // Its page first; extraction queues the analysis again (normally the queue already routed it there).
  if (waitsForPage(input)) return { analysisId: null, stale: false, needsBody: true, output: null, receiptIds: [], reused: true };
  const replayModels = config.editorialMode === 'automatic' ? await replayModelConfiguration(opts) : null;
  const inputHash = replayModels ? replayInputHash(input, replayModels) : null;
  if (inputHash && !opts.attemptTag) {
    const previous = await sql.begin(async tx => {
      await tx`SELECT id FROM articles WHERE id=${articleId} FOR UPDATE`;
      const current = await loadAnalyzeInput(articleId, tx);
      return current && replayInputHash(current, replayModels) === inputHash ? reusableAutomaticAnalysis(tx, articleId, input.revision, inputHash) : null;
    });
    if (previous) return previous;
  }
  const run = await runAnalysis(input, opts);
  const out = normalizeAnalysis(run);
  const receiptIds = [
    run.prefilter.receiptId, ...(run.scores?.receiptIds ?? []), ...(run.writing?.receiptIds ?? []), ...(run.structure ? [run.structure.receiptId] : []),
  ];
  const w = run.writing;
  const detail: Record<string, unknown> = {
    prefilter: { label: run.prefilter.label, reason: run.prefilter.reason },
    scores: out.scores, scoreRange: out.scoreRange, scoreModel: out.scoreModel, threshold: out.threshold, ...(out.scoreRefused ? { scoreRefused: true } : {}),
    ...(w ? { writer: w.kind, writerModel: w.model, itemType: w.itemType ?? null, authorRole: w.authorRole ?? null } : {}),
    ...(w?.identityGuard?.outcome === "fallback" ? { identityGuard: w.identityGuard } : {}),
    fact: out.fact,
  };
  const model = w?.model ?? run.prefilter.model;
  const resultHash = analysisResultHash(model, receiptIds, out, detail);
  // If a model switch raced the run, keep its result but do not advertise it as replayable.
  if (inputHash && !opts.attemptTag && stableJson(replayModels) === stableJson(await replayModelConfiguration(opts))) detail.automaticReplay = {
    inputHash, resultHash,
  };
  const committed = await sql.begin(async (tx) => {
    const [current] = await tx<{ revision: number }[]>`SELECT revision FROM articles WHERE id = ${articleId} FOR UPDATE`;
    const currentInput = inputHash && current ? await loadAnalyzeInput(articleId, tx) : null;
    const stale = !current || current.revision !== input.revision || !!inputHash && (!currentInput || replayInputHash(currentInput, replayModels) !== inputHash);
    if (!stale && inputHash && detail.automaticReplay && !opts.attemptTag) {
      const previous = await reusableAutomaticAnalysis(tx, articleId, input.revision, inputHash, resultHash);
      if (previous) {
        for (const id of receiptIds) await completeReceipt(tx, id);
        return previous;
      }
    }
    if (detail.automaticReplay) {
      const receipts = await tx`SELECT id,logical_key,response FROM receipts WHERE id=ANY(${receiptIds}) ORDER BY id`;
      Object.assign(detail.automaticReplay, { receiptHash: sha256(stableJson(receipts)) });
    }
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO analyses (article_id, input_revision, origin, model, prompt_version, receipt_ids, relevance, category, tags,
        subjects, title_zh, summary_zh, reason_zh, score, selected, output)
      VALUES (${articleId}, ${input.revision}, 'model', ${model}, ${ANALYZE_PROMPT_VERSION}, ${receiptIds},
        ${out.relevance}, ${out.category}, ${out.tags}, ${out.subjects}, ${out.titleZh}, ${out.summaryZh}, ${out.reasonZh},
        ${out.score}, ${out.selected}, ${tx.json(detail as never)})
      RETURNING id`;
    for (const id of receiptIds) await completeReceipt(tx, id);
    if (!stale) {
      // Match the publication lock order: article -> report cutoff -> source.
      await tx`SELECT pg_advisory_xact_lock_shared(hashtext('report_candidates'))`;
      await tx`UPDATE articles SET processing_state = ${out.relevance === "block" ? "blocked" : "analyzed"}, processing_error = NULL WHERE id = ${articleId}`;
      // A newer judgement changes the exact proposal even when the material revision
      // did not change (for example an explicit rerun). Close the old grant atomically.
      if (config.editorialMode === "automatic") await queueAutomaticVerificationTx(tx, articleId);
      else if (out.relevance === "pass") await considerAutoPublicationTx(tx, articleId);
      await publishArticleTx(tx, articleId);
    }
    return { analysisId: row!.id, stale };
  });
  if ('output' in committed) return committed;
  const reused = run.prefilter.reused && (run.scores?.reused ?? true) && (w?.reused ?? true) && (run.structure?.reused ?? true);
  return { analysisId: committed.analysisId, stale: committed.stale, output: out, receiptIds, reused };
}
