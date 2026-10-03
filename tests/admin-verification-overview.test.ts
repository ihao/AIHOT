import './setup.ts';
import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { tag } from './setup.ts';
import { config } from '../packages/backend/src/config.ts';
import { closeDb, sql } from '../packages/backend/src/db.ts';
import { getBoss, stopBoss } from '../packages/backend/src/jobs/queue.ts';
import { automaticCopyHash, AUTOMATIC_RULE_VERSION } from '../packages/backend/src/editorial/automatic-verification.ts';
import { getReviewProposal } from '../packages/backend/src/editorial/review.ts';
import { acceptedAutomaticRuleVersions } from '@aihot/industry/automatic-rule-compatibility';
import { automaticVerificationOverview } from '../packages/backend/src/admin/runs.ts';
const source = `overview-${tag()}`, now = new Date('2099-10-03T00:00:00Z'), copy = {titleZh:'客户端发布更新',summaryZh:'客户端发布维护更新。',reasonZh:null,category:'infrastructure'};
const oldMode = config.editorialMode;
let serial = 0;
before(async()=>{
 config.editorialMode='automatic';
 await getBoss(); // Initialize queue tables before the read-only snapshot on a fresh test database.
 await sql`INSERT INTO sources(id,name,kind,config,tier,participation_mode,first_party,next_fetch_at) VALUES(${source},'Overview fixture','rss','{}','T1','editorial',true,'2100-01-01')`;
 await sql`INSERT INTO source_auto_public_policies(source_id,enabled,version,changed_by,reason) VALUES(${source},true,1,'test','local fixture')`;
});
afterEach(async()=>{
 await sql`DELETE FROM audit_log WHERE subject IN (SELECT 'content:'||id FROM articles WHERE source_id=${source})`;
 await sql`DELETE FROM articles WHERE source_id=${source}`;
 await sql`UPDATE sources SET enabled=true WHERE id=${source}`;
 await sql`UPDATE source_auto_public_policies SET enabled=true,version=1 WHERE source_id=${source}`;
});
after(async()=>{await sql`DELETE FROM sources WHERE id=${source}`; config.editorialMode=oldMode;await stopBoss();await closeDb();});
async function fixture(age=0, scores:unknown=[80,80]){
 const id=`overview-${tag()}-${++serial}`, at=new Date(now.getTime()-age);
 await sql`INSERT INTO articles(id,source_id,identity_key,url,title,published_at,discovered_at,timeline_at,body_text,body_status,processing_state)
 VALUES(${id},${source},${id},${`https://example.com/${id}`},'Client release',${at},${at},${at},'Client release body','ok','analyzed')`;
 const [an]=await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,category,title_zh,summary_zh,output,created_at)
 VALUES(${id},1,'model','pass',${copy.category},${copy.titleZh},${copy.summaryZh},${sql.json({scores,threshold:1} as never)},${at}) RETURNING id`;
 return {id,analysis:Number(an!.id)};
}
async function round(f:{id:string;analysis:number}, status='accepted', version=AUTOMATIC_RULE_VERSION, reasons:string[]=[], decisions:unknown[]=[], revision=1){
 const hash=automaticCopyHash(copy), fingerprint=(await getReviewProposal(f.id))!.fingerprint;
 const [r]=await sql`INSERT INTO automatic_verifications(article_id,article_revision,analysis_id,automatic_rule_version,verification_model,verification_config_hash,source_policy_version,final_fingerprint,original_copy_hash,final_copy_hash,original_copy,final_copy,materials,status,selected,reasons,decisions)
 VALUES(${f.id},${revision},${f.analysis},${version},'local','fixture',1,${fingerprint},${hash},${hash},${sql.json(copy)},${sql.json(copy)},${sql.json([{id:'original',url:`https://example.com/${f.id}`,bodyText:'Client release body',primary:true}])},${status},true,${sql.json(reasons)},${sql.json(decisions as never)}) RETURNING id`;
 return Number(r!.id);
}
async function publication(f:{id:string;analysis:number}){
 const fingerprint=(await getReviewProposal(f.id))!.fingerprint;
 await sql`INSERT INTO editorial_reviews(article_id,status,fingerprint,article_revision,analysis_id,override_version,source_policy_version,version,reviewed_by,reviewed_at,reason)
 VALUES(${f.id},'auto_public',${fingerprint},1,${f.analysis},0,1,1,'automatic-verification',now(),'local fixture')`;
 await sql`INSERT INTO publications(article_id,analysis_id,revision,title,summary,category,source_id,channel,url,discovered_at,timeline_at,sort_at,visibility,eligible,selected,visible_after)
 SELECT id,${f.analysis},1,${copy.titleZh},${copy.summaryZh},${copy.category},source_id,'news',url,discovered_at,timeline_at,timeline_at,'public',true,true,${new Date(now.getTime()-1)} FROM articles WHERE id=${f.id}`;
}
const current = async()=> (await automaticVerificationOverview(now)).current;
const baseline = async()=>structuredClone(await current());
test('current articles count old rejection and new acceptance once while preserving round history',async()=>{
 const base=await baseline(), f=await fixture();
 await round(f,'rejected','old-rule',['old_missing']); await round(f);
 const o=await automaticVerificationOverview(now);
 assert.equal(o.current.collected,base.collected+1);assert.equal(o.current.passed,base.passed+1);
 assert.equal(o.current.counts.accepted,(base.counts.accepted??0)+1);assert.equal(o.current.counts.rejected??0,base.counts.rejected??0);
 assert.ok(o.counts.rejected>=1);assert.ok(o.counts.accepted>=1);
 assert.equal(o.current.acceptanceRate,1);
});
test('latest analysis of current revision controls PASS and complete integer scores at current tier threshold',async()=>{
 const base=await baseline(), f=await fixture();await round(f);
 await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,output) VALUES(${f.id},1,'model','block',${sql.json({scores:[90,90]})})`;
 assert.equal((await current()).passed,base.passed);assert.equal((await current()).scoreQualified,base.scoreQualified);
 await sql`UPDATE articles SET revision=2 WHERE id=${f.id}`;
 assert.equal((await current()).passed,base.passed);
 for(const scores of [[60,60],[59,99],[80],[80,80,80,80],[80,80.5],['80',80],[60,81]])await fixture(0,scores);
 const c=await current();assert.equal(c.scoreQualified,base.scoreQualified+1);
});
test('actual public and selected follow source authorization, policy version, eligibility and release gates',async()=>{
 const base=await baseline(), f=await fixture();await round(f);await publication(f);
 const visible=await current();assert.equal(visible.public,base.public+1);assert.equal(visible.selected,base.selected+1);
 await sql`UPDATE sources SET enabled=false WHERE id=${source}`;assert.equal((await current()).public,base.public);assert.equal((await current()).selected,base.selected);
 await sql`UPDATE sources SET enabled=true WHERE id=${source}`;
 await sql`UPDATE source_auto_public_policies SET version=2 WHERE source_id=${source}`;assert.equal((await current()).selected,base.selected);
 await sql`UPDATE source_auto_public_policies SET version=1,enabled=false WHERE source_id=${source}`;assert.equal((await current()).public,base.public);
 await sql`UPDATE source_auto_public_policies SET enabled=true WHERE source_id=${source}`;
 await sql`UPDATE publications SET eligible=false WHERE article_id=${f.id}`;assert.equal((await current()).public,base.public);assert.equal((await current()).selected,base.selected);
 await sql`UPDATE publications SET eligible=true,visible_after=${new Date(now.getTime()+1)} WHERE article_id=${f.id}`;assert.equal((await current()).selected,base.selected);
});
test('current rule in every status wins; valid accepted legacy fallback and historical reasons stay distinct',async()=>{
 const base=await baseline(), f=await fixture(), legacy=acceptedAutomaticRuleVersions(AUTOMATIC_RULE_VERSION)[1]!;
 await round(f,'accepted',legacy);assert.equal((await current()).counts.accepted,(base.counts.accepted??0)+1);
 await round(f,'waiting',AUTOMATIC_RULE_VERSION,['waiting_for_budget']);
 const c=await current();assert.equal(c.counts.accepted??0,base.counts.accepted??0);assert.equal(c.counts.waiting,(base.counts.waiting??0)+1);
 const h=await fixture();await round(h,'rejected','unknown-old',['claim_0_quote_invalid']);
 assert.ok((await current()).historicalReasons.some(r=>r.reason==='claim_0_quote_invalid'));
});
test('persisted quote failures and evidence fetch outcomes are classified separately and reads cause no work',async()=>{
 const base=await baseline(), f=await fixture();
 await round(f,'rejected',AUTOMATIC_RULE_VERSION,['claim_0_quote_invalid','claim_1_primary_evidence_missing'],[{evidenceFetch:[{reason:'unsupported_entry'},{reason:'fetch_failed'},{reason:'identity_mismatch'},{reason:'pdf_unreadable'},{reason:'body_unreadable'}]}]);
 const snapshot=async()=> (await sql`SELECT (SELECT count(*) FROM receipts)::int AS receipts,(SELECT count(*) FROM receipt_attempts)::int AS attempts,(SELECT count(*) FROM pgboss.job)::int AS jobs,(SELECT count(*) FROM deliveries)::int AS deliveries`)[0];
 const before=await snapshot(), originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw new Error('admin reads must never fetch');};
 try {const c=await current();for(const reason of ['quote_invalid','primary_evidence_unverified','unsupported_entry','fetch_failed','identity_mismatch','pdf_unreadable','body_unreadable'])assert.equal(c.diagnostics.find(x=>x.reason===reason)?.n,(base.diagnostics.find(x=>x.reason===reason)?.n??0)+1,reason);
 assert.equal(calls,0);assert.deepEqual(await snapshot(),before);}finally{globalThis.fetch=originalFetch;}
});
test('high score warning begins at four hours only for fresh PASS unpublished candidates and no actual selection',async()=>{
 const f=await fixture(4*60*60*1000-1);
 assert.equal((await current()).selectionState,'normal');
 await sql`UPDATE analyses SET created_at=${new Date(now.getTime()-4*60*60*1000)} WHERE id=${f.analysis}`;
 assert.equal((await current()).selectionState,'investigate');
 await sql`UPDATE analyses SET output=${sql.json({scores:[59,59]})} WHERE id=${f.analysis}`;assert.equal((await current()).selectionState,'normal');
 await sql`UPDATE analyses SET output=${sql.json({scores:[80,80]})} WHERE id=${f.analysis}`;
 await sql`UPDATE articles SET published_at=${new Date(now.getTime()-49*60*60*1000)} WHERE id=${f.id}`;assert.equal((await current()).selectionState,'normal');
 await sql`UPDATE articles SET published_at=${now} WHERE id=${f.id}`;await round(f);await publication(f);
 assert.equal((await current()).selectionState,'normal');
});

test('repeated qualifying analysis keeps the current qualifying episode age; intervening block restarts it',async()=>{
 const f=await fixture(5*60*60*1000);
 const insert=async(relevance:string)=>sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,output,created_at) VALUES(${f.id},1,'model',${relevance},${sql.json({scores:[80,80]})},${now})`;
 await insert('pass');assert.equal((await current()).selectionState,'investigate');
 await insert('block');await insert('pass');assert.equal((await current()).selectionState,'normal');
});

test('new accepted decisions do not erase old fetch diagnostics or relabel them as current failures',async()=>{
 const f=await fixture();await round(f,'rejected','historical-rule',['claim_0_quote_invalid'],[{evidenceFetch:[{reason:'pdf_unreadable'},{reason:'pdf_unreadable'}]}]);await round(f);
 const c=await current();assert.equal(c.diagnostics.find(x=>x.reason==='quote_invalid'),undefined);
 assert.equal(c.historicalDiagnostics.find(x=>x.reason==='quote_invalid')?.n,1);
 assert.equal(c.historicalDiagnostics.find(x=>x.reason==='pdf_unreadable')?.n,1);
});

test('legacy accepted fallback cannot count changed original material as current acceptance',async()=>{
 const f=await fixture(), legacy=acceptedAutomaticRuleVersions(AUTOMATIC_RULE_VERSION)[1]!;
 await round(f,'accepted',legacy);await publication(f);assert.equal((await current()).counts.accepted,1);
 await sql`UPDATE articles SET body_text='changed without matching stored evidence' WHERE id=${f.id}`;
 assert.equal((await current()).public,0);assert.equal((await current()).counts.accepted??0,0);
});

test('persisted stage quote and primary-evidence failures survive a later generic final reason once per article',async()=>{
 const f=await fixture();
 await round(f,'waiting',AUTOMATIC_RULE_VERSION,['no_new_primary_evidence'],[
  {decision:{reasons:['claim_0_quote_invalid','claim_1_primary_evidence_missing']},evidenceFetch:[{reason:'fetch_failed'}]},
  {decision:{reasons:['claim_0_quote_invalid','claim_1_primary_evidence_missing']}},
 ]);
 const c=await current();
 for(const reason of ['quote_invalid','primary_evidence_unverified','fetch_failed'])assert.equal(c.diagnostics.find(x=>x.reason===reason)?.n,1,reason);
 assert.deepEqual(c.reasons,[{reason:'no_new_primary_evidence',n:1}], 'current reasons retain the final decision semantics');
 await round(f,'rejected','old-stage-rule',['request_failed'],[{decision:{reasons:['claim_0_quote_invalid','claim_1_primary_evidence_missing']}}]);
 const history=await current();
 for(const reason of ['quote_invalid','primary_evidence_unverified'])assert.equal(history.historicalDiagnostics.find(x=>x.reason===reason)?.n,1,reason);
});

test('manual review of unchanged content removes old automatic acceptance from current statistics',async()=>{
 const f=await fixture();await round(f);await publication(f);
 const before=(await getReviewProposal(f.id))!.fingerprint;assert.equal((await current()).counts.accepted,1);
 await sql`INSERT INTO audit_log(actor,action,subject,reason) VALUES('test','content.review',${`content:${f.id}`},'manual rejection')`;
 assert.equal((await getReviewProposal(f.id))!.fingerprint,before,'manual takeover need not change the copy fingerprint');
 const c=await current();assert.equal(c.counts.accepted??0,0);assert.equal(c.public,0);assert.equal(c.selected,0);
});

for(const held of ['manual-review','imported-analysis','not-analyzed'] as const) {
 test(`high score waiting warning excludes ${held} while retaining PASS and score funnel counts`,async()=>{
  const f=await fixture(5*60*60*1000);
  assert.equal((await current()).selectionState,'investigate','a normal automatic candidate establishes the warning');
  if(held==='manual-review')await sql`INSERT INTO audit_log(actor,action,subject,reason) VALUES('test','content.review',${`content:${f.id}`},'manual rejection')`;
  if(held==='imported-analysis')await sql`UPDATE analyses SET origin='rule' WHERE id=${f.analysis}`;
  if(held==='not-analyzed')await sql`UPDATE articles SET processing_state='new' WHERE id=${f.id}`;
  const c=await current();assert.equal(c.selectionState,'normal');assert.equal(c.highScoreWaiting,0);
  assert.equal(c.passed,1);assert.equal(c.scoreQualified,1,'warning candidacy does not change the scoring funnel');
 });
}
