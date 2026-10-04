// A shadow assessment never changes publication rows. Scores/source permission are controlled
// passing fixtures so the unchanged factual gate, including literal quotes, decides each case.
import {VerificationSchema,evaluateAutomaticPublication} from './automatic-policy.ts';
import {deterministicCopyConflicts,requiresPrimaryEvidence,type AutomaticCopy} from './automatic-verification.ts';
import type {Material} from './evidence-materials.ts';

export interface VerificationAssessmentCase {
  id:string;articleId:string;sourceId:string;sourceUrl:string;originalTitle:string;
  firstParty:boolean;category:string;originalBodyText:string;copy:AutomaticCopy;materials:Material[];
  expectedPublic:boolean;family:'official_supported'|'official_negative'|'secondary_boundary'|'risk_boundary';
  expectedIssue:string|null;evidenceQuote:string;labelBasis:'agent_literal_source_review';
  sourceSpanStart:number;sourceSpanEnd:number;expectedRoute?:'max';
}

export function validateAssessmentCases(input:unknown):VerificationAssessmentCase[] {
  if(!Array.isArray(input))throw new Error('assessment dataset must be an array');
  const ids=new Set<string>();
  for(const raw of input){
    const c=raw as VerificationAssessmentCase;
    if(!c||c.labelBasis!=='agent_literal_source_review'||typeof c.expectedPublic!=='boolean')throw new Error('missing explicit source-review label provenance');
    if(!c.id||ids.has(c.id)||!c.articleId||!c.sourceId||!c.sourceUrl)throw new Error('case/source identity missing or duplicated');
    ids.add(c.id);
    const original=c.materials?.find(m=>m.id==='original');
    if(typeof c.originalBodyText!=='string'||!original||original.primary!==c.firstParty||original.url!==c.sourceUrl
      ||c.materials.length!==1||original.role!=='original_source'
      ||c.sourceSpanStart!==0||c.sourceSpanEnd!==c.originalBodyText.length||!c.originalBodyText.length
      ||original.bodyText!==c.originalBodyText
      ||!c.evidenceQuote||!original.bodyText.includes(c.evidenceQuote))throw new Error(`snapshot/span/literal evidence invalid: ${c.id}`);
    if(!['official_supported','official_negative','secondary_boundary','risk_boundary'].includes(c.family))throw new Error('unknown assessment family');
    if(c.family.startsWith('official_')&&(!c.firstParty||c.expectedPublic!==(c.family==='official_supported')))throw new Error('official labels do not match their declared family');
  }
  const cases=input as VerificationAssessmentCase[];
  if(cases.length<100||new Set(cases.map(c=>c.articleId)).size<40
    ||cases.filter(c=>c.family==='official_supported').length<40||cases.filter(c=>c.family==='official_negative').length<40
    ||cases.filter(c=>c.family==='secondary_boundary'||c.family==='risk_boundary').length<20)throw new Error('assessment needs >=100 cases, >=40 articles, 40 supported +40 negative official and20 boundaries');
  return cases;
}

export function assessVerificationCase(c:Pick<VerificationAssessmentCase,'copy'|'materials'|'firstParty'|'originalTitle'|'originalBodyText'|'category'>,verification:unknown) {
  const parsed=VerificationSchema.safeParse(verification);
  const decision=evaluateAutomaticPublication({
    sourceAuthorized:true,sourceEnabled:true,bodyReadable:true,relevance:'PASS',copy:c.copy,
    scores:[80,80],threshold:60,verification,materials:c.materials,
    requiresPrimaryEvidence:requiresPrimaryEvidence({first_party:c.firstParty,title:c.originalTitle,body_text:c.originalBodyText,category:c.category,output:{}}),
    primaryEvidenceScope:'claims',rewritten:false,
  });
  const conflicts=deterministicCopyConflicts(c.copy,c.materials);
  const full=conflicts.length?{...decision,public:false,selected:false,reasons:[...decision.reasons,...conflicts],verificationVerdict:'contradicted' as const}:decision;
  const citationsValid=parsed.success&&!full.reasons.some(r=>/quote_invalid|material_ids_not_unique/.test(r))
    &&parsed.data.claims.every(claim=>claim.verdict!=='supported'||claim.evidence.length>0);
  return {decision:full,structureValid:parsed.success,citationsValid};
}

export interface AssessmentResult {
  id:string;family:string;expectedPublic:boolean;public:boolean;structureValid:boolean;citationsValid:boolean;
  reasons:string[];receiptId:number|null;requestHash:string;verifier?:unknown;usage?:unknown;error?:string;differenceReview?:string;
}
/** Private review notes are editable; paid identities and derived quality verdicts are not. */
export function resumeAssessmentResults(cases:readonly VerificationAssessmentCase[],input:unknown,requestHashes:Map<string,string>):AssessmentResult[] {
  if(!Array.isArray(input))throw new Error('assessment results must be an array');
  const byId=new Map(cases.map(c=>[c.id,c])),seen=new Set<string>();
  return input.map(raw=>{
    const r=raw as AssessmentResult,c=byId.get(r?.id);
    if(!c||seen.has(r.id)||r.family!==c.family||r.expectedPublic!==c.expectedPublic||r.requestHash!==requestHashes.get(c.id)
      ||!Number.isSafeInteger(r.receiptId)||r.receiptId!<=0)throw new Error('assessment resume identity differs from the current dataset/request');
    seen.add(r.id);
    const note=typeof r.differenceReview==='string'?r.differenceReview.trim():undefined;
    if(r.error){if(r.verifier!==undefined)throw new Error('invalid output cannot contain a valid verifier');return {...r,public:false,structureValid:false,citationsValid:false,reasons:['model_output_invalid'],differenceReview:note};}
    const checked=assessVerificationCase(c,r.verifier);
    return {...r,public:checked.decision.public,structureValid:checked.structureValid,citationsValid:checked.citationsValid,reasons:checked.decision.reasons,differenceReview:note};
  });
}
