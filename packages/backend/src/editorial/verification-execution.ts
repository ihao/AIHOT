// Execution choices are persisted per round; they never change factual publication authority.
import { criticalClaimFlags, VerificationSchema } from './automatic-policy.ts';
import { promptMaterials, type Material } from './evidence-materials.ts';
import { promptText, promptVersion } from './prompts.ts';
import { chatJson, MODELS } from '../providers/llm.ts';
import { sha256, stableJson } from '../lib/ids.ts';

export type VerificationExecutionPolicy = 'legacy-v1' | 'bounded-v1';
export const NEW_VERIFICATION_EXECUTION_POLICY: VerificationExecutionPolicy = 'bounded-v1';
export const ORDINARY_VERIFICATION_MODEL = 'dashscope-deepseek-v4.1-flash';
export const VERIFICATION_ROUTING_SETTING = 'verification.routing';
export interface VerificationRoutingSettings {
  enabled?: boolean;
  ordinaryModel?: string;
  assessmentHash?: string;
  datasetHash?: string;
}
export interface VerificationRoutingInput {
  first_party: boolean;
  title: string;
  body_text: string | null;
  category: string | null;
  output: Record<string, unknown>;
  title_zh?: string | null;
  summary_zh?: string | null;
  reason_zh?: string | null;
  /** Deterministic caller conflicts cannot be cleared by a model's confidence or flags. */
  conflicts?: readonly string[];
}

const conflictStatus = (value: unknown) => typeof value === 'string' && /conflict|contradict|disput|冲突|矛盾|争议/i.test(value);
function explicitConflict(output: Record<string, unknown>) {
  return ['conflict','conflicting','materialConflict','evidenceConflict'].some(key => output[key] === true || conflictStatus(output[key]))
    || ['conflictStatus','materialStatus','evidenceStatus','status'].some(key => conflictStatus(output[key]))
    || ['conflicts','riskFlags'].some(key => Array.isArray(output[key]) && output[key].length > 0);
}
/** Scope is computed from immutable source text and taxonomy, never verifier confidence. */
export function ordinaryVerificationEligible(input: VerificationRoutingInput): boolean {
  if (input.first_party !== true || input.conflicts?.length || explicitConflict(input.output)) return false;
  if (['security','policy','regulation','governance'].includes(input.category ?? '')) return false;
  if (/security|policy|regulat|governance|hack|exploit|attack|loss|enforcement|conflict/i.test(String(input.output.itemType ?? ''))) return false;
  const originalAndCopy = [input.title,input.body_text,input.title_zh,input.summary_zh,input.reason_zh].filter(Boolean).join('\n');
  return criticalClaimFlags(originalAndCopy).length === 0
    && !/\b(?:attacker|stole|theft|vulnerabilit(?:y|ies))\b/i.test(originalAndCopy)
    && !/\b(?:conflict(?:ing|ed)?|contradict(?:ion|ory|ed|s)?|disputed)\b|材料冲突|存在冲突|相互矛盾|说法不一|尚有争议/i.test(originalAndCopy);
}
export function routeVerificationModel(input: VerificationRoutingInput, configuredMax: string, settings?: VerificationRoutingSettings | null): string {
  return settings?.enabled === true && (settings.ordinaryModel ?? ORDINARY_VERIFICATION_MODEL) === ORDINARY_VERIFICATION_MODEL
    && ordinaryVerificationEligible(input) ? ORDINARY_VERIFICATION_MODEL : configuredMax;
}

type ExecutionPrompt = 'verify-summary' | 'rewrite-verified-summary';
export function executionConfig(profile: VerificationExecutionPolicy, kind: ExecutionPrompt = 'verify-summary') {
  if (profile !== 'legacy-v1' && profile !== 'bounded-v1') throw new Error(`Unknown verification execution policy ${profile}`);
  return {system:promptText(kind),promptVersion:promptVersion(kind),temperature:kind === 'verify-summary' ? 0 : 0.2,
    maxTokens:kind === 'verify-summary' && profile === 'legacy-v1' ? 16_384 : 4096};
}
export function executionModelConfigHash(model: string, profile: VerificationExecutionPolicy = 'legacy-v1', kind: ExecutionPrompt = 'verify-summary'): string {
  const spec=MODELS[model],controls=executionConfig(profile,kind);
  return sha256(stableJson({model:spec?.model,service:spec?.service,extra:spec?.extra??null,jsonMode:spec?.jsonMode,...controls}));
}
/** Literal duplicates are removed only within each material; paragraph IDs and metadata survive.
 * All unique source paragraphs remain, including adjacent conditions and negations. No summaries,
 * relevance pruning or truncation are used. Database snapshots are never modified. */
export function executionMaterials(materials: readonly Material[], profile: VerificationExecutionPolicy) {
  executionConfig(profile);
  const packets=promptMaterials(materials);
  if (profile === 'legacy-v1') return packets;
  return packets.map(packet => {
    const seen=new Set<string>();
    return {...packet,quotes:packet.quotes.filter(quote => {
      if (seen.has(quote.text)) return false;
      seen.add(quote.text);return true;
    })};
  });
}
export interface VerificationExecutionInput {
  copy: {titleZh:string|null;summaryZh:string|null;reasonZh:string|null;category:string|null};
  original_copy: VerificationExecutionInput['copy'];
  originalTitle: string;
  materials: readonly Material[];
  requiresPrimaryEvidence: boolean;
  rewritten: boolean;
}
/** Worker and assessment share the final evidence payload, prompt, output bound and schema. */
export function verificationRequest(input: VerificationExecutionInput, model: string, profile: VerificationExecutionPolicy, attemptTag?: string, subject?: string) {
  return {model,purpose:'verify_summary',subject:subject??'verification-assessment',...executionConfig(profile),
    user:stableJson({copy:input.copy,requiresPrimaryEvidence:input.requiresPrimaryEvidence,primaryEvidenceScope:'claims',rewritten:input.rewritten,
      original_copy:input.original_copy,originalTitle:input.originalTitle,materials:executionMaterials(input.materials,profile)}),schema:VerificationSchema,attemptTag};
}
export function executeVerification(input: VerificationExecutionInput, model: string, profile: VerificationExecutionPolicy, attemptTag?: string, subject?: string) {
  return chatJson(verificationRequest(input,model,profile,attemptTag,subject));
}
