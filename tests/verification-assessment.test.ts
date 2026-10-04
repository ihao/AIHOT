import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assessVerificationCase,validateAssessmentCases,resumeAssessmentResults} from '../packages/backend/src/editorial/verification-assessment.ts';

const ordinary={id:'positive',articleId:'a1',sourceId:'s1',sourceUrl:'https://example.com/a1',originalTitle:'Version 2 enters beta',firstParty:true,category:'infrastructure',originalBodyText:'Version 2 enters beta.',copy:{titleZh:'版本2进入测试阶段',summaryZh:'官方宣布版本2进入测试阶段。',reasonZh:null,category:'infrastructure'},materials:[{id:'original',url:'https://example.com/a1',bodyText:'Version 2 enters beta.',primary:true,role:'original_source' as const}],expectedPublic:true,family:'official_supported' as const,expectedIssue:null,evidenceQuote:'Version 2 enters beta.',labelBasis:'agent_literal_source_review' as const,sourceSpanStart:0,sourceSpanEnd:22};
const supported={verdict:'supported',claims:[{claim:'版本2进入测试阶段',verdict:'supported',evidence:[{materialId:'original',quoteId:'original:p1'}],riskFlags:[],reason:'逐字材料支持'}],checks:{claimsComplete:true,chineseCopyFaithful:true,subject:true,numbers:true,units:true,time:true,chain:true,stage:true,attribution:true,noSpeculationAsFact:true,notMarketing:true,coreEventPreserved:true},riskFlags:[],reason:'有证据'};

test('assessment runs the whole factual publication gate and rejects fabricated paragraph references',()=>{
  assert.equal(assessVerificationCase(ordinary,supported).decision.public,true);
  const fabricated=structuredClone(supported);fabricated.claims[0]!.evidence[0]!.quoteId='original:p9';
  const result=assessVerificationCase(ordinary,fabricated);
  assert.equal(result.decision.public,false);
  assert.equal(result.citationsValid,false);
});

test('resume binds unique cases and final requests and recomputes editable report metrics',()=>{
  const hashes=new Map([[ordinary.id,'request-hash']]);
  const result={id:ordinary.id,family:ordinary.family,expectedPublic:true,public:false,structureValid:false,citationsValid:false,reasons:['edited'],receiptId:1,requestHash:'request-hash',verifier:supported,differenceReview:' reviewed '};
  const [restored]=resumeAssessmentResults([ordinary],[result],hashes);
  assert.equal(restored!.public,true);assert.equal(restored!.structureValid,true);assert.equal(restored!.citationsValid,true);assert.equal(restored!.differenceReview,'reviewed');
  assert.throws(()=>resumeAssessmentResults([ordinary],[result,result],hashes),/identity/);
  assert.throws(()=>resumeAssessmentResults([ordinary],[{...result,id:'foreign'}],hashes),/identity/);
  assert.throws(()=>resumeAssessmentResults([ordinary],[{...result,expectedPublic:false}],hashes),/identity/);
  assert.throws(()=>resumeAssessmentResults([ordinary],[{...result,requestHash:'old-request'}],hashes),/identity/);
  const [invalid]=resumeAssessmentResults([ordinary],[{...result,verifier:{},public:true,structureValid:true,citationsValid:true}],hashes);
  assert.equal(invalid!.public,false);assert.equal(invalid!.structureValid,false);assert.equal(invalid!.citationsValid,false);
});

test('a supported model verdict cannot remove first-party protection from risk boundary cases',()=>{
  const risk={...ordinary,firstParty:false,family:'risk_boundary' as const,expectedPublic:false,
    copy:{...ordinary.copy,titleZh:'媒体报道协议遭受攻击',summaryZh:'媒体报道协议遭受攻击。',category:'security'},
    materials:ordinary.materials.map(m=>({...m,primary:false}))};
  const v=structuredClone(supported);v.claims[0]!.claim='媒体报道协议遭受攻击';
  const result=assessVerificationCase(risk,v);
  assert.equal(result.decision.public,false);
  assert.ok(result.decision.reasons.some(r=>/primary_evidence_missing|critical_copy/.test(r)));
});

test('assessment refuses missing label provenance, tampered snapshots and undersized datasets',()=>{
  assert.throws(()=>validateAssessmentCases([ordinary]),/100|40/);
  assert.throws(()=>validateAssessmentCases([{...ordinary,labelBasis:'model_verdict'}]),/label|来源|标注/);
  assert.throws(()=>validateAssessmentCases([{...ordinary,materials:[{...ordinary.materials[0]!,bodyText:'fabricated'}]}]),/snapshot|快照|区间/);
  const clipped={...ordinary,originalBodyText:'Version 2 enters beta. This is not a public release.',sourceSpanEnd:22};
  assert.throws(()=>validateAssessmentCases([clipped]),/snapshot|full|完整/,'a literal fragment must not remove an adjacent negation');
  assert.throws(()=>validateAssessmentCases([{...ordinary,materials:[...ordinary.materials,...ordinary.materials]}]),/snapshot|unique|唯一/,'original paragraph identity must remain unique');
});
