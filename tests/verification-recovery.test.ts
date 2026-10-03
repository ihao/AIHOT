import assert from 'node:assert/strict';
import { test } from 'node:test';
const recovery=await import('../packages/backend/src/editorial/verification-recovery.ts').catch(()=>null);
test('missing evidence fetches first then rewrites once even when no materials were added',()=>{
 assert.ok(recovery);
 const d={public:false,verificationVerdict:'needs_evidence' as const};
 assert.equal(recovery.nextRecoveryStage(d,{evidence_fetched:false,rewritten:false,verification_count:1}),'evidence');
 assert.equal(recovery.nextRecoveryStage(d,{evidence_fetched:true,rewritten:false,verification_count:1}),'rewrite');
 assert.equal(recovery.nextRecoveryStage(d,{evidence_fetched:true,rewritten:true,verification_count:2}),null);
 assert.equal(recovery.nextRecoveryStage(d,{evidence_fetched:true,rewritten:false,verification_count:3}),null);
 assert.equal(recovery.nextRecoveryStage({public:false,verificationVerdict:'supported'},{evidence_fetched:false,rewritten:false,verification_count:1}),null,'non-factual eligibility cannot trigger paid rewriting');
});
test('stage attempts recover successful caches but never buy failed unknown or malformed attempts again',()=>{
 assert.ok(recovery);
 for(const status of ['failed','unknown','pending']) assert.equal(recovery.canRequestStage(1,false,status),false,status);
 assert.equal(recovery.canRequestStage(1,true,'received'),true);
 assert.equal(recovery.canRequestStage(1,true,'failed'),false);
 assert.equal(recovery.canRequestStage(0,false,null),true);
});
test('immutable core rejects changed actor action stage and deleted or placeholder events',()=>{
 assert.ok(recovery);
 const original={titleZh:'Arbitrum 安全理事会已执行升级',summaryZh:'Arbitrum 安全理事会已在链上执行升级。',reasonZh:null,category:'governance'};
 for(const copy of [
  {...original,titleZh:'Optimism 安全理事会已执行升级',summaryZh:'Optimism 安全理事会已在链上执行升级。'},
  {...original,titleZh:'Arbitrum 安全理事会发起提案',summaryZh:'Arbitrum 安全理事会正在讨论提案。'},
  {...original,titleZh:'Arbitrum 安全理事会已投票通过升级',summaryZh:'Arbitrum 安全理事会已投票通过升级。'},
  {...original,titleZh:'Arbitrum 更新情况',summaryZh:'Arbitrum 发布了一条信息。'},
  {...original,titleZh:'原文信息待确认',summaryZh:'具体事实仍待确认。'}]) assert.ok(recovery.coreCopyConflicts(original,'Arbitrum Security Council executed upgrade',copy).length,JSON.stringify(copy));
 assert.deepEqual(recovery.coreCopyConflicts(original,'Arbitrum Security Council executed upgrade',{...original,summaryZh:'Arbitrum 安全理事会执行了升级。'}),[]);
});
const compatibility=await import('../industry/automatic-rule-compatibility.ts');
const {AUTOMATIC_RULE_VERSION}=await import('../packages/backend/src/editorial/automatic-verification.ts');
test('audited legacy rewrite grants are exact article rule and immutable hash pairs only',()=>{
 assert.ok('auditedLegacyCopyProofs' in compatibility);
 const proofs=compatibility.auditedLegacyCopyProofs(AUTOMATIC_RULE_VERSION);assert.equal(proofs.length,10);
 assert.ok(!proofs.some(p=>p.article_id==='ye2rgxg1y87s3tto9nh3sjcca'));
 for(const proof of proofs){
  assert.equal(compatibility.compatibleAcceptedCopy({...proof,rewritten:true},AUTOMATIC_RULE_VERSION),true);
  for(const mutate of [{article_id:'different'},{automatic_rule_version:'future'},{original_copy_hash:'changed'},{final_copy_hash:'changed'}])assert.equal(compatibility.compatibleAcceptedCopy({...proof,...mutate,rewritten:true},AUTOMATIC_RULE_VERSION),false);
 }
 assert.deepEqual(compatibility.auditedLegacyCopyProofs(`${AUTOMATIC_RULE_VERSION}-next`),[]);
});
