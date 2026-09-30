// Attention scores describe value and observed model variation. They are neither factual
// correctness probabilities nor statistical confidence intervals. Evidence is a separate gate.
import { z } from "zod";
import { CATEGORY_KEYS } from "@aihot/contracts/taxonomy";
import type { EditorialMode } from "../config.ts";

export const AUTOMATIC_POLICY_VERSION = "automatic-publication-v1";

export function scoreAssessment(values: readonly number[], threshold: number | null, mode: EditorialMode = "automatic") {
  if (values.length > 3 || values.some((v) => !Number.isInteger(v) || v < 0 || v > 100)) throw new Error("scores must contain at most three integer values between 0 and 100");
  if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0 || threshold > 100)) throw new Error("score threshold must be between 0 and 100");
  const count = values.length;
  const min = count ? Math.min(...values) : null;
  const max = count ? Math.max(...values) : null;
  const mean = count ? values.reduce((sum, v) => sum + v, 0) / count : null;
  const crosses = threshold !== null && min !== null && max !== null && min < threshold && max >= threshold;
  const stable = count >= 2 && max! - min! <= 20 && !crosses;
  const needsAdditionalScore = mode === "automatic" && count === 2 && (crosses || max! - min! > 20);
  const selected = threshold !== null && mean !== null && (mode === "manual"
    ? count === 2 && mean >= threshold
    : count >= 2 && stable && min! >= threshold);
  return { count, min, max, mean, stable, selected, needsAdditionalScore };
}

const VerdictSchema = z.enum(["supported", "needs_evidence", "contradicted"]);
export const VerificationSchema = z.object({
  verdict: VerdictSchema,
  claims: z.array(z.object({
    claim: z.string().trim().min(1).max(2000),
    verdict: VerdictSchema,
    evidence: z.array(z.object({ materialId: z.string().trim().min(1).max(200), exactQuote: z.string().trim().min(1).max(8000) })).max(12),
    reason: z.string().max(1000),
  })).min(1).max(100),
  checks: z.object({
    claimsComplete: z.boolean(), chineseCopyFaithful: z.boolean(), subject: z.boolean(), numbers: z.boolean(),
    units: z.boolean(), time: z.boolean(), chain: z.boolean(), stage: z.boolean(), attribution: z.boolean(),
    noSpeculationAsFact: z.boolean(), notMarketing: z.boolean(),
  }),
  riskFlags: z.array(z.string().trim().min(1).max(100)).max(20),
  reason: z.string().max(2000),
});
export type Verification = z.infer<typeof VerificationSchema>;
export type VerificationVerdict = z.infer<typeof VerdictSchema>;

/** Material identity, body and primary status come from the caller's fetched snapshots, never the model. */
export interface VerificationMaterial { id: string; bodyText: string; primary: boolean }
export interface AutomaticPublicationInput {
  sourceAuthorized: boolean;
  sourceEnabled: boolean;
  bodyReadable: boolean;
  relevance: string;
  copy: { titleZh: string | null; summaryZh: string | null; reasonZh: string | null; category: string | null };
  scores: readonly number[];
  threshold: number | null;
  scoreRefused?: boolean;
  verification: unknown;
  materials: readonly VerificationMaterial[];
  /** Caller policy for critical secondary reporting; the model cannot downgrade this requirement. */
  requiresPrimaryEvidence: boolean;
}

const whitespace = (s: string) => s.replace(/\s+/gu, " ").trim();
const chinese = (s: string | null) => !!s?.trim() && /\p{Script=Han}/u.test(s);

export function evaluateAutomaticPublication(input: AutomaticPublicationInput) {
  const scores = scoreAssessment(input.scores, input.threshold);
  const reasons: string[] = [];
  if (!input.sourceAuthorized) reasons.push("source_not_authorized");
  if (!input.sourceEnabled) reasons.push("source_disabled");
  if (!input.bodyReadable || !input.materials.length || input.materials.some((m) => !m.id.trim() || !m.bodyText.trim())) reasons.push("original_unreadable");
  if (input.relevance.toUpperCase() !== "PASS") reasons.push("prefilter_not_pass");
  if (!chinese(input.copy.titleZh) || !chinese(input.copy.summaryZh) || (input.copy.reasonZh !== null && !chinese(input.copy.reasonZh)) || !CATEGORY_KEYS.includes(input.copy.category as typeof CATEGORY_KEYS[number])) reasons.push("copy_incomplete");
  if (input.threshold === null) reasons.push("score_threshold_missing");
  if (input.scoreRefused || scores.count < 2 || scores.needsAdditionalScore) reasons.push("scores_incomplete");

  const parsed = VerificationSchema.safeParse(input.verification);
  let verificationVerdict: VerificationVerdict = "needs_evidence";
  if (!parsed.success) reasons.push("verification_missing_or_invalid");
  else {
    const v = parsed.data;
    verificationVerdict = v.verdict;
    if (v.verdict !== "supported") reasons.push(`verification_${v.verdict}`);
    for (const [key, passed] of Object.entries(v.checks)) {
      if (!passed) {
        reasons.push(`check_${key}_failed`);
        // False includes missing/unknown evidence; only an explicit verdict establishes contradiction.
        if (verificationVerdict === "supported") verificationVerdict = "needs_evidence";
      }
    }
    const materials = new Map(input.materials.map((m) => [m.id, m]));
    if (materials.size !== input.materials.length) reasons.push("material_ids_not_unique");
    const primaryRequired = input.requiresPrimaryEvidence || v.riskFlags.length > 0;
    for (const [index, claim] of v.claims.entries()) {
      if (claim.verdict !== "supported") {
        reasons.push(`claim_${index}_${claim.verdict}`);
        if (claim.verdict === "contradicted") verificationVerdict = "contradicted";
        else if (verificationVerdict === "supported") verificationVerdict = "needs_evidence";
      }
      let hasPrimary = false;
      if (!claim.evidence.length) reasons.push(`claim_${index}_evidence_missing`);
      for (const e of claim.evidence) {
        const material = materials.get(e.materialId);
        const quote = whitespace(e.exactQuote);
        if (!material || !quote || !whitespace(material.bodyText).includes(quote)) reasons.push(`claim_${index}_quote_invalid`);
        else hasPrimary ||= material.primary;
      }
      if (primaryRequired && !hasPrimary) reasons.push(`claim_${index}_primary_evidence_missing`);
    }
    if (verificationVerdict === "supported" && reasons.some((r) => /^claim_|^material_/.test(r))) verificationVerdict = "needs_evidence";
  }
  const isPublic = reasons.length === 0;
  return { public: isPublic, selected: isPublic && scores.selected, reasons, verificationVerdict, scoreAssessment: scores };
}
