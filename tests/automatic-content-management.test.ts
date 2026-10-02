import './setup.ts';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { config } from '../packages/backend/src/config.ts';
import { sql, closeDb } from '../packages/backend/src/db.ts';
import { upsertMaterial } from '../packages/backend/src/content/materials.ts';
import { setSourceAutoPublic, proposeReview } from '../packages/backend/src/editorial/review.ts';
import { queueAutomaticVerificationTx, verifyAutomaticArticle, AUTOMATIC_RULE_VERSION } from '../packages/backend/src/editorial/automatic-verification.ts';
import { listReviewQueue } from '../packages/backend/src/admin/review.ts';
import { updateSource } from '../packages/backend/src/admin/sources.ts';
import { contentChain } from '../packages/backend/src/admin/content.ts';
import { stopBoss } from '../packages/backend/src/jobs/queue.ts';
import { queueProcessing } from '../packages/backend/src/jobs/content.ts';
import { tag } from './setup.ts';
import { buildApp } from '../apps/api/src/app.ts';
import { decideArticleReview } from '../packages/backend/src/editorial/decision.ts';

const source = `auto-content-${tag()}`;
const oldMode = config.editorialMode;
let serial = 0;
before(async () => {
  config.editorialMode = 'automatic';
  await sql`INSERT INTO sources(id,name,kind,config,tier,participation_mode,first_party,next_fetch_at)
    VALUES(${source},'Automatic content fixture','rss',${sql.json({feedUrl:'https://bitcoincore.org/rss'})},'T1','editorial',true,'2100-01-01')`;
  await setSourceAutoPublic(source,{enabled:true,version:0,reason:'fixture'},'test');
});
after(async () => { config.editorialMode=oldMode; await stopBoss(); await closeDb(); });

async function material() {
  const {articleId:id}=await upsertMaterial({sourceId:source,url:`https://bitcoincore.org/${source}/${++serial}`,
    title:'Bitcoin client release',bodyText:'Bitcoin Core released a new maintenance version.',bodyStatus:'ok',via:'fetch',publishedAt:new Date()});
  await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected,output)
    VALUES(${id},1,'model','pass','infrastructure','客户端维护版本发布','Bitcoin Core 宣布维护版本可用。',70,true,${sql.json({scores:[70,70],threshold:60})})`;
  await sql`UPDATE articles SET processing_state='analyzed' WHERE id=${id}`;
  await sql.begin(tx=>queueAutomaticVerificationTx(tx,id));
  return id;
}

test('automatic terminal refusals are archived with reasons without creating human review proposals',async () => {
  const id=await material();
  await sql`UPDATE automatic_verifications SET status='rejected',reasons='["no_new_primary_evidence"]' WHERE article_id=${id}`;
  const before=await sql`SELECT * FROM editorial_reviews WHERE article_id=${id}`;
  const q=await listReviewQueue(40,source);
  assert.equal(q.pendingCount,0,'automatic refusal is complete, not an outstanding human decision');
  assert.equal(q.mode,'automatic');
  assert.deepEqual(q.rows,[]);
  assert.equal(q.automation?.counts.unpublished,1);
  const row=q.automation?.rows.find(r=>r.id===id);
  assert.equal(row?.status,'unpublished');
  assert.ok(row?.reasons.includes('no_new_primary_evidence'));
  assert.deepEqual(await sql`SELECT * FROM editorial_reviews WHERE article_id=${id}`,before,'reading automatic results must not create pending proposals');
  const chain=await contentChain(id);
  assert.equal(chain?.automaticVerifications[0]?.status,'rejected');
  const intervention=await listReviewQueue(40,source,'intervention');
  assert.ok(intervention.rows.some(r=>r.id===id),'optional human correction keeps the existing exact-version approval lane');
});

test('active automatic waits and invalid accepted results never become human pending or published',async () => {
  const id=await material();
  await sql`UPDATE automatic_verifications SET status='waiting',reasons='["Budget for llm exhausted (hour)"]',retry_at=now()+interval '1 hour' WHERE article_id=${id}`;
  const waiting=await listReviewQueue(40,source);
  assert.equal(waiting.pendingCount,0);
  const row=waiting.automation?.rows.find(r=>r.id===id);
  assert.equal(row?.status,'processing');
  assert.ok(row?.retryAt);
  assert.ok(row?.reasons.includes('budget_wait'));
  await sql`UPDATE automatic_verifications SET status='accepted',analysis_id=(SELECT min(id) FROM analyses WHERE article_id=${id}),final_fingerprint='obsolete',retry_at=NULL WHERE article_id=${id}`;
  const invalid=await listReviewQueue(40,source);
  assert.equal(invalid.automation?.rows.find(r=>r.id===id)?.status,'unpublished');
  assert.equal(invalid.automation?.counts.published,0);
});

test('paused source history is an archive even when source invalidation resets an approved review',async () => {
  const id=await material();
  await proposeReview(id);
  await sql`UPDATE editorial_reviews SET status='approved',reviewed_by='test',reviewed_at=now() WHERE article_id=${id}`;
  const [s]=await sql`SELECT updated_at FROM sources WHERE id=${source}`;
  await updateSource(source,{patch:{enabled:false},version:s.updated_at.toISOString(),reason:'pause fixture'},'test');
  const q=await listReviewQueue(40,source,'paused');
  assert.equal(q.pendingCount,0);
  assert.equal(q.automation?.counts.processing,0);
  assert.equal(q.automation?.rows.find(r=>r.id===id)?.status,'paused');
  const before=await sql`SELECT count(*)::int n FROM receipt_attempts`;
  await verifyAutomaticArticle(id);
  assert.deepEqual(await sql`SELECT count(*)::int n FROM receipt_attempts`,before,'disabled source must spend no verification request');
  const [review]=await sql`SELECT status FROM editorial_reviews WHERE article_id=${id}`;
  assert.equal(review.status,'pending','revoked authority remains revoked, separate from operational archive');
  config.editorialMode='manual';
  const manual=await listReviewQueue(40,source);
  assert.equal(manual.pendingCount,0,'paused sources must not enter the manual lane either');
  config.editorialMode='automatic';
});

test('terminal freshness rejection clears retry, selection and public projection and never requeues',async () => {
  const [s]=await sql`SELECT updated_at FROM sources WHERE id=${source}`;
  await updateSource(source,{patch:{enabled:true},version:s.updated_at.toISOString(),reason:'resume fixture'},'test');
  const id=await material();
  await sql`UPDATE articles SET published_at=now()-interval '72 hours' WHERE id=${id}`;
  await sql`UPDATE automatic_verifications SET selected=true,retry_at=now()+interval '1 hour' WHERE article_id=${id}`;
  await verifyAutomaticArticle(id);
  const [r]=await sql`SELECT status,retry_at,selected FROM automatic_verifications WHERE article_id=${id} AND automatic_rule_version=${AUTOMATIC_RULE_VERSION}`;
  assert.equal(r.status,'rejected');
  assert.equal(r.retry_at,null);
  assert.equal(r.selected,false,'a terminal refusal cannot retain selected=true');
});

test('new materials of disabled sources do not enter the automatic analysis queue',async () => {
  const [s]=await sql`SELECT updated_at FROM sources WHERE id=${source}`;
  await updateSource(source,{patch:{enabled:false},version:s.updated_at.toISOString(),reason:'pause fixture'},'test');
  const {articleId:id}=await upsertMaterial({sourceId:source,url:`https://bitcoincore.org/${source}/${++serial}`,
    title:'New source material',bodyText:'A new original material.',bodyStatus:'ok',via:'fetch',publishedAt:new Date()});
  assert.equal(await queueProcessing(id),null,'a paused source cannot resume paid analysis through recovery');
  const [a]=await sql`SELECT processing_state,processing_retry_at FROM articles WHERE id=${id}`;
  assert.equal(a.processing_state,'skipped');
  assert.equal(a.processing_retry_at,null);
});

test('admin navigation never advertises mandatory human review in automatic mode',async () => {
  const previous=config.devAdmin;
  config.devAdmin={displayName:'Test administrator'};
  const app=await buildApp();
  try {
    const response=await app.inject({method:'GET',url:'/api/admin/nav-counts'});
    assert.equal(response.statusCode,200);
    assert.equal(response.json().review,0);
  } finally {await app.close();config.devAdmin=previous;}
});

test('unrecognized status filters use the normal overview instead of object prototype properties',async () => {
  const q=await listReviewQueue(40,source,'constructor');
  assert.equal(q.automation?.view,'all');
});

test('a valid selected release waiting for its deadline is automatic work, not an invalid grant',async () => {
  const [s]=await sql`SELECT updated_at FROM sources WHERE id=${source}`;
  await updateSource(source,{patch:{enabled:true},version:s.updated_at.toISOString(),reason:'resume fixture'},'test');
  const id=await material();
  const proposal=await proposeReview(id);
  const [review]=await sql`SELECT version FROM editorial_reviews WHERE article_id=${id}`;
  await decideArticleReview(id,{status:'approved',curated:true,fingerprint:proposal!.fingerprint,version:review.version,reason:'fixture'},'test');
  await sql`UPDATE publications SET visible_after=now()+interval '1 hour' WHERE article_id=${id}`;
  const q=await listReviewQueue(40,source);
  const row=q.automation?.rows.find(r=>r.id===id);
  assert.equal(row?.status,'processing');
  assert.deepEqual(row?.reasons,['publication_scheduled']);
  assert.ok(row?.retryAt);
});
