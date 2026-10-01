import {tag} from './setup.ts';
import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import {sql,closeDb} from '../packages/backend/src/db.ts';
import {upsertMaterial} from '../packages/backend/src/content/materials.ts';
import {paidRequest} from '../packages/backend/src/providers/receipts.ts';
import {autoReleaseUnknownReceipts} from '../packages/backend/src/admin/runs.ts';
import {QUEUES,stopBoss} from '../packages/backend/src/jobs/queue.ts';
const T=tag(),source=`receipt-recovery-${T}`;
before(async()=>{await sql`INSERT INTO sources(id,name,kind,tier) VALUES(${source},'local recovery source','rss','T1')`;});
after(async()=>{await stopBoss();await closeDb();});
async function lost(purpose:string,error?:string){
 const {articleId}=await upsertMaterial({sourceId:source,url:`https://example.com/${T}/${purpose}/${tag()}`,title:'Protocol update',bodyText:'Protocol update.',bodyStatus:'ok',via:'fetch',publishedAt:new Date()});
 const subject=`article:${articleId}@1`;
 await assert.rejects(paidRequest({service:'dashscope',purpose,subject,identity:{tag:T,articleId}},async()=>{throw new Error('local lost response simulation');}),/lost response/);
 const [receipt]=await sql`UPDATE receipts SET updated_at=now()-interval '40 minutes' WHERE subject=${subject} RETURNING id`;
 await sql`UPDATE articles SET processing_state='failed',processing_attempts=1,processing_error=${error??`receipt ${receipt!.id} outcome unknown`} WHERE id=${articleId}`;
 return {articleId,receiptId:receipt!.id};
}
test('the actual once-only receipt recovery requeues every split analysis step without another paid request',async()=>{
 const cases=[];
 for(const purpose of ['analyze_article','prefilter_article','score_article','structure_article','understand_article','summarize_article'])cases.push(await lost(purpose));
 const [before]=await sql`SELECT count(*)::int AS n FROM receipt_attempts`;
 const result=await autoReleaseUnknownReceipts();assert.equal(result.requeued,cases.length);
 for(const c of cases){
  const [article]=await sql`SELECT processing_state,processing_attempts,processing_error FROM articles WHERE id=${c.articleId}`;
  assert.deepEqual({...article},{processing_state:'new',processing_attempts:0,processing_error:null});
  assert.equal((await sql`SELECT 1 FROM pgboss.job WHERE name=${QUEUES.analyze} AND data->>'articleId'=${c.articleId}`).length,1);
  const [audit]=await sql`SELECT after FROM audit_log WHERE action='receipt.release' AND subject=${`receipt:${c.receiptId}`} ORDER BY id DESC LIMIT 1`;
  assert.equal(audit!.after.billed,null);assert.equal(audit!.after.requeued,true);
 }
 const [after]=await sql`SELECT count(*)::int AS n FROM receipt_attempts`;assert.equal(after!.n,before!.n,'release only queues; it cannot directly send a paid request');
 assert.equal((await autoReleaseUnknownReceipts()).requeued,0);
});
test('release cannot reset an unrelated refusal or turn verification into an analysis retry',async()=>{
 const refused=await lost('structure_article','permanent unrelated refusal'),verification=await lost('verify_summary');
 assert.equal((await autoReleaseUnknownReceipts()).requeued,0);
 for(const c of [refused,verification]){
  const [article]=await sql`SELECT processing_state FROM articles WHERE id=${c.articleId}`;assert.equal(article!.processing_state,'failed');
  assert.equal((await sql`SELECT 1 FROM pgboss.job WHERE name=${QUEUES.analyze} AND data->>'articleId'=${c.articleId}`).length,0);
 }
});

test('a prior authorized release stranded by the old mapping is recovered once without releasing or billing again',async()=>{
 const c=await lost('structure_article');
 const note='自动放行：结果未知超过 30 分钟，未核对是否计费';
 await sql`UPDATE receipts SET status='failed',error=${note} WHERE id=${c.receiptId}`;
 await sql`UPDATE receipt_attempts SET status='failed',error=${note} WHERE receipt_id=${c.receiptId}`;
 const [before]=await sql`SELECT count(*)::int AS n FROM receipt_attempts`;
 const recovered=await autoReleaseUnknownReceipts();assert.equal(recovered.released,0);assert.equal(recovered.requeued,1);
 assert.equal((await autoReleaseUnknownReceipts()).requeued,0);
 const [after]=await sql`SELECT count(*)::int AS n FROM receipt_attempts`;assert.equal(after!.n,before!.n);
 const [audit]=await sql`SELECT after FROM audit_log WHERE action='receipt.requeue_after_release' AND subject=${`receipt:${c.receiptId}`}`;
 assert.equal(audit!.after.billed,null);
});
