export const VERIFICATION_RECOVERY_VERSION='immutable-core-bounded-rewrite-v4';
export const MAX_VERIFICATION_ATTEMPTS=3;
export const MAX_REWRITE_ATTEMPTS=1;
export function nextRecoveryStage(d:{public:boolean;verificationVerdict:string},r:{evidence_fetched:boolean;rewritten:boolean;verification_count:number}):'evidence'|'rewrite'|null {
  if(d.public||!['needs_evidence','contradicted'].includes(d.verificationVerdict)||r.verification_count>=MAX_VERIFICATION_ATTEMPTS)return null;
  if(d.verificationVerdict==='needs_evidence'&&!r.evidence_fetched)return 'evidence';
  return !r.rewritten?'rewrite':null;
}
/** Only successful raw receipts may be replayed after the single rewrite attempt was sent. */
export function canRequestStage(attempts:number,successfulCache:boolean,status:string|null){return attempts<MAX_REWRITE_ATTEMPTS||(successfulCache&&(status==='received'||status==='completed'));}
type Copy={titleZh:string|null;summaryZh:string|null;reasonZh:string|null;category:string|null};
/** Catch clear core substitutions in addition to the verifier's mandatory semantic core check. */
export function coreCopyConflicts(original:Copy,originalTitle:string,copy:Copy):string[]{
 const text=`${copy.titleZh??''}\n${copy.summaryZh??''}`,core=`${originalTitle}\n${original.titleZh??''}`;
 const reasons:string[]=[];
 if(/^(?:原文信息待确认|信息待确认|具体事实仍待确认|暂无可确认|暂无明确|相关信息|事件待核实)/u.test(copy.titleZh??''))reasons.push('rewrite_core_placeholder');
 const ignored=new Set(['The','A','An','New','Security','Council','Release','Confirmed','Study']);
 const names=[...originalTitle.matchAll(/\b[A-Z][a-zA-Z]+\b/g)].map(m=>m[0]).filter(n=>!ignored.has(n) && (original.titleZh??'').includes(n));
 for(const name of names)if(!text.toLowerCase().includes(name.toLowerCase()))reasons.push('rewrite_core_subject_changed');
 const stages=[[/executed|implemented|已.{0,5}执行|链上执行|执行完成/i,/executed|implemented|执行了|已.{0,5}执行|链上执行|执行完成/i],
  [/testnet|测试网/i,/testnet|测试网/i],[/mainnet|主网/i,/mainnet|主网/i],
  [/\b(?:proposed|proposal)\b|提议|提出提案|发起提案/i,/\b(?:proposed|proposal)\b|提议|提出提案|发起提案/i]];
 for(const [before,after]of stages)if(before.test(core)&&!after.test(text))reasons.push('rewrite_core_stage_changed');
 const actions=[[/\b(?:hack|attack|exploit|stolen)\b|攻击|被盗|漏洞利用/i,/攻击|被盗|入侵|漏洞利用|\b(?:hack|attack|exploit|stolen)\b/i],
  [/\b(?:sanction|charges|sued|lawsuit)\b|制裁|起诉|指控/i,/制裁|起诉|指控|\b(?:sanction|charges|sued|lawsuit)\b/i],
  [/\b(?:release|upgrade)\b|发布.{0,10}版本|升级/i,/发布.{0,20}(?:版本|软件|客户端)|升级|\b(?:release|upgrade)\b/i]];
 for(const [before,after]of actions)if(before.test(core)&&!after.test(text))reasons.push('rewrite_core_action_deleted');
 return [...new Set(reasons)];
}
