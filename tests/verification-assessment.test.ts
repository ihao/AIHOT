import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assessVerificationCase,validateAssessmentCases} from '../packages/backend/src/editorial/verification-assessment.ts';

const ordinary={id:'positive',articleId:'a1',sourceId:'s1',sourceUrl:'https://example.com/a1',originalTitle:'Version 2 enters beta',firstParty:true,category:'infrastructure',originalBodyText:'Version 2 enters beta.',copy:{titleZh:'版本2进入测试阶段',summaryZh:'官方宣布版本2进入测试阶段。',reasonZh:null,category:'infrastructure'},materials:[{id:'original',url:'https://example.com/a1',bodyText:'Version 2 enters beta.',primary:true,role:'original_source' as const}],expectedPublic:true,family:'official_supported' as const,expectedIssue:null,evidenceQuote:'Version 2 enters beta.',labelBasis:'agent_literal_source_review' as const,sourceSpanStart:0,sourceSpanEnd:22};
const supported={verdict:'supported',claims:[{claim:'版本2进入测试阶段',verdict:'supported',evidence:[{materialId:'original',quoteId:'original:p1'}],riskFlags:[],reason:'逐字材料支持'}],checks:{claimsComplete:true,chineseCopyFaithful:true,subject:true,numbers:true,units:true,time:true,chain:true,stage:true,attribution:true,noSpeculationAsFact:true,notMarketing:true,coreEventPreserved:true},riskFlags:[],reason:'有证据'};

test('assessment runs the whole factual publication gate and rejects fabricated paragraph references',()=>{
  assert.equal(assessVerificationCase(ordinary,supported).decision.public,true);
  const fabricated=structuredClone(supported);fabricated.claims[0]!.evidence[0]!.quoteId='original:p9';
  const result=assessVerificationCase(ordinary,fabricated);
  assert.equal(result.decision.public,false);
  assert.equal(result.citationsValid,false);
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
});
