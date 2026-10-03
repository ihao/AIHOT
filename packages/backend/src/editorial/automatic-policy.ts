// Attention scores describe value and observed model variation. They are neither factual
// correctness probabilities nor statistical confidence intervals. Evidence is a separate gate.
import { z } from "zod";
import { CATEGORY_KEYS } from "@aihot/contracts/taxonomy";
import type { EditorialMode } from "../config.ts";

export const CLAIM_QUOTE_VERSION = "server-paragraph-quotes-v2";
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

export const CLAIM_EVIDENCE_POLICY_VERSION = "critical-claims-v4";
export const CLAIM_RISK_FLAGS = ["attack_confirmation", "loss_amount", "regulatory_outcome", "governance_execution"] as const;
const RiskFlagSchema = z.enum(CLAIM_RISK_FLAGS);
/** Only assertions in the actual copy/claim activate these protections, never article background. */
export function criticalClaimFlags(text: string): typeof CLAIM_RISK_FLAGS[number][] {
  text = text.replace(/美国证券(?:与)?交易委员会|证券交易委员会/gu, 'SEC')
    .replace(/美国商品期货交易委员会|商品期货交易委员会/gu, 'CFTC');
  const flags: typeof CLAIM_RISK_FLAGS[number][] = [];
  if (/(?:安全漏洞|安全事件|安全缺陷|漏洞)[^。.!?\n]{0,50}(?:确认|证实|已被利用)|(?:确认|证实)[^。.!?\n]{0,40}(?:安全漏洞|安全事件|安全缺陷|漏洞)|攻击|被盗|遭入侵|遭黑客|遭受漏洞利用|\b(?:hack(?:ed|ing)?|exploit(?:ed)?|attack(?:ed)?|breach|stolen|drain(?:ed)?)\b/i.test(text)) flags.push("attack_confirmation");
  if (/(?:损失|被盗|流失|loss(?:es)?|stolen|drained)[^。.!?\n]{0,100}(?:\d|[一二三四五六七八九十百千万亿])|(?:\$|美元|USDC|USDT|ETH|BTC)[^。.!?\n]{0,40}(?:loss|stolen|损失|被盗)|(?:\d+(?:[.,]\d+)?|[零〇一二两三四五六七八九十百千万亿]+)\s*(?:[千万亿]*)(?:美元|元|人民币|港元|USDC|USDT|ETH|BTC)?[^。.!?\n]{0,30}(?:损失|被盗|流失|loss|stolen|drained)/i.test(text)) flags.push("loss_amount");
  if (/(?:SEC|CFTC|OFAC|财政部|监管机构|监管部门|法院|法庭)[^。.!?\n]{0,100}(?:起诉|指控|处罚|制裁|罚款|裁决|批准|驳回|sue|charg|enforc|sanction|fine|rul(?:e|ed|ing)|approv|dismiss)|(?:SEC|CFTC|OFAC|财政部|监管机构|监管部门)[^。.!?\n]{0,100}(?:提出|发布|公布|宣布|拟议|通过|采用|生效|实施|propos|publish|adopt|enact)[^。.!?\n]{0,40}(?:规则|提案|草案|征求意见稿|rule|proposal)|(?:正式监管动作|监管结果|诉讼结果)/i.test(text)) flags.push("regulatory_outcome");
  if (/(?:治理|提案|升级|安全理事会|governance|proposal|upgrade|security council)[^。.!?\n]{0,100}(?:已.{0,5}执行|已经.{0,5}实施|链上执行|执行了|执行完成|已完成|executed|execution completed|implemented)/i.test(text)) flags.push("governance_execution");
  return flags;
}
const VerdictSchema = z.enum(["supported", "needs_evidence", "contradicted"]);
export const VerificationSchema = z.object({
  verdict: VerdictSchema,
  claims: z.array(z.object({
    claim: z.string().trim().min(1).max(2000),
    verdict: VerdictSchema,
    evidence: z.array(z.object({ materialId: z.string().trim().min(1).max(200), exactQuote: z.string().trim().min(1).max(8000).optional(), quoteId: z.string().trim().min(1).max(400).optional() }).refine(e => !!e.exactQuote || !!e.quoteId)).max(12),
    riskFlags: z.array(RiskFlagSchema).max(4).optional(),
    reason: z.string().max(1000),
  })).min(1).max(100),
  checks: z.object({
    claimsComplete: z.boolean(), chineseCopyFaithful: z.boolean(), subject: z.boolean(), numbers: z.boolean(),
    units: z.boolean(), time: z.boolean(), chain: z.boolean(), stage: z.boolean(), attribution: z.boolean(),
    noSpeculationAsFact: z.boolean(), notMarketing: z.boolean(), coreEventPreserved: z.boolean().optional(),
  }),
  riskFlags: z.array(z.string().trim().min(1).max(100)).max(20),
  reason: z.string().max(2000),
});
export type Verification = z.infer<typeof VerificationSchema>;
export type VerificationVerdict = z.infer<typeof VerdictSchema>;

/** Material identity, body and primary status come from the caller's fetched snapshots, never the model. */
export interface VerificationMaterial { id: string; bodyText: string; primary: boolean }
/** Recompute paragraph IDs from actual text, never model supplied quote metadata. */
export function materialQuotes(m:VerificationMaterial) { return m.bodyText.split(/\n\s*\n/gu).map(s=>s.trim()).filter(Boolean).map((text,index)=>({quoteId:`${m.id}:p${index+1}`,text})); }
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
  primaryEvidenceScope?: "whole" | "claims";
  rewritten?: boolean;
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
    if (input.rewritten && v.checks.coreEventPreserved !== true) reasons.push("check_coreEventPreserved_failed");
    const materials = new Map(input.materials.map((m) => [m.id, m]));
    if (materials.size !== input.materials.length) reasons.push("material_ids_not_unique");
    const claimScoped = input.primaryEvidenceScope === "claims" && v.claims.every(c => c.riskFlags !== undefined);
    const copyFlags = criticalClaimFlags(`${input.copy.titleZh ?? ''}\n${input.copy.summaryZh ?? ''}\n${input.copy.reasonZh ?? ''}`);
    if (claimScoped) for (const flag of copyFlags) if (!v.claims.some(c => criticalClaimFlags(c.claim).includes(flag) || c.riskFlags?.includes(flag))) reasons.push(`critical_copy_${flag}_claim_missing`);
    const wholePrimary = !claimScoped && (input.requiresPrimaryEvidence || v.riskFlags.length > 0 || copyFlags.length > 0);
    for (const [index, claim] of v.claims.entries()) {
      if (claim.verdict !== "supported") {
        reasons.push(`claim_${index}_${claim.verdict}`);
        if (claim.verdict === "contradicted") verificationVerdict = "contradicted";
        else if (verificationVerdict === "supported") verificationVerdict = "needs_evidence";
      }
      const primaryRequired = wholePrimary || (claimScoped && (criticalClaimFlags(claim.claim).length > 0 || !!claim.riskFlags?.length));
      let hasPrimary = false;
      if (!claim.evidence.length) reasons.push(`claim_${index}_evidence_missing`);
      for (const e of claim.evidence) {
        const material = materials.get(e.materialId);
        const paragraph = e.quoteId && material ? materialQuotes(material).find(q => q.quoteId === e.quoteId) : null;
        const quote = whitespace(e.quoteId ? paragraph?.text ?? '' : e.exactQuote ?? '');
        const mismatchedExact = !!e.quoteId && e.exactQuote !== undefined && whitespace(e.exactQuote) !== quote;
        if (!material || !quote || mismatchedExact || !whitespace(material.bodyText).includes(quote)) reasons.push(`claim_${index}_quote_invalid`);
        else hasPrimary ||= material.primary;
      }
      if (primaryRequired && !hasPrimary) reasons.push(`claim_${index}_primary_evidence_missing`);
    }
    if (verificationVerdict === "supported" && reasons.some((r) => /^claim_|^material_|^critical_copy_|^check_coreEventPreserved/.test(r))) verificationVerdict = "needs_evidence";
  }
  const isPublic = reasons.length === 0;
  return { public: isPublic, selected: isPublic && scores.selected, reasons, verificationVerdict, scoreAssessment: scores };
}
