import { stub, tag } from './setup.ts';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import type { PgBoss } from 'pg-boss';
import { config } from '../packages/backend/src/config.ts';
import { sql, closeDb } from '../packages/backend/src/db.ts';
import { upsertMaterial } from '../packages/backend/src/content/materials.ts';
import { registerEventJobs } from '../packages/backend/src/jobs/events.ts';
import { stopBoss, QUEUES } from '../packages/backend/src/jobs/queue.ts';
const T=tag(),source=`group-wait-${T}`;
const provider=await stub(()=>assert.fail('a zero budget must prevent the paid embedding request'));
process.env.DASHSCOPE_API_KEY='test-only';process.env.DASHSCOPE_BASE_URL=`${provider.url}/v1`;
const oldCalls=config.modelCallsEnabled;config.modelCallsEnabled=true;
const handlers=new Map<string,any>();let budgets:any[];
before(async()=>{
 budgets=await sql`SELECT * FROM budgets WHERE service='dashscope'`;
 await sql`UPDATE budgets SET per_minute=0 WHERE service='dashscope'`;
 await sql`INSERT INTO sources(id,name,kind,tier,participation_mode) VALUES(${source},'group wait local','rss','T1','editorial')`;
 await registerEventJobs({work:async(name:string,_opts:unknown,handler:unknown)=>handlers.set(name,handler)} as unknown as PgBoss);
});
after(async()=>{
 for(const b of budgets)await sql`UPDATE budgets SET per_minute=${b.per_minute},per_hour=${b.per_hour},per_day=${b.per_day} WHERE service=${b.service}`;
 config.modelCallsEnabled=oldCalls;await provider.close();await stopBoss();await closeDb();
});
async function material(suffix:string){
 const {articleId:id}=await upsertMaterial({sourceId:source,url:`https://example.com/${T}/${suffix}`,title:'Protocol maintenance release',bodyText:'Protocol maintenance release.',bodyStatus:'ok',via:'fetch',publishedAt:new Date()});
 await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected,output) VALUES(${id},1,'rule','pass','infrastructure','协议维护更新','协议维护更新。',80,false,'{}')`;
 await sql`UPDATE articles SET processing_state='analyzed' WHERE id=${id}`;
 return id;
}
test('actual grouping worker persists a budget wait, sweeps it once, and honors a manual decision after recovery',async()=>{
 const first=await material('first'),id=await material('waiting');
 const [story]=await sql`INSERT INTO stories(public_id,title) VALUES(${randomUUID()},'Protocol maintenance') RETURNING id`;
 const [fact]=await sql`INSERT INTO facts(public_id,story_id,title) VALUES(${`f-${T}`},${story!.id},'Protocol maintenance') RETURNING id`;
 await sql`INSERT INTO fact_articles(fact_id,article_id) VALUES(${fact!.id},${first})`;
 const handler=handlers.get(QUEUES.group);
 const result=await handler([{data:{articleId:id,force:true}}]);
 assert.equal(result.verdict,'waiting');assert.equal(provider.hits(),0);
 const [waiting]=await sql`SELECT * FROM event_group_waits WHERE article_id=${id}`;
 assert.equal(waiting!.force_regroup,true);assert.ok(waiting!.retry_at.getTime()>Date.now());
 const [article]=await sql`SELECT processing_state FROM articles WHERE id=${id}`;
 assert.equal(article!.processing_state,'analyzed','a provider cap cannot undo article analysis');
 const {sweepGroupWaits}=await import('../packages/backend/src/jobs/events.ts');
 assert.equal((await sweepGroupWaits()).enqueued,0,'future waits must not spin');
 await sql`UPDATE event_group_waits SET retry_at=now()-interval '1 minute' WHERE article_id=${id}`;
 assert.equal((await sweepGroupWaits()).enqueued,1);assert.equal((await sweepGroupWaits()).enqueued,0);
 const [queued]=await sql`SELECT data,retry_limit FROM pgboss.job WHERE name=${QUEUES.group} AND data->>'articleId'=${id} ORDER BY created_on DESC LIMIT 1`;
 assert.deepEqual(queued!.data,{articleId:id,signalOnly:false,force:true});
 // A human's explicit standalone decision wins while the delayed task is waiting.
 const {detachFromFact}=await import('../packages/backend/src/admin/content.ts');
 await detachFromFact(id,'local explicit decision','test');
 assert.equal((await handler([{data:queued!.data}])).verdict,'manual');
 assert.equal((await sql`SELECT 1 FROM event_group_waits WHERE article_id=${id}`).length,0);
 assert.equal(provider.hits(),0);
});
