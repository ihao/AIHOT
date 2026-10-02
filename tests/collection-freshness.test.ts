import { tag } from './setup.ts';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { sql, closeDb } from '../packages/backend/src/db.ts';
import { upsertMaterial } from '../packages/backend/src/content/materials.ts';
import { queueProcessing, processArticle } from '../packages/backend/src/jobs/content.ts';
import { stopBoss } from '../packages/backend/src/jobs/queue.ts';

import { config } from '../packages/backend/src/config.ts';
import http from 'node:http';
import { collectSource } from '../packages/backend/src/sources/collect.ts';
import { freshnessReason } from '../packages/backend/src/content/freshness.ts';
config.editorialMode = 'automatic';

const source = `freshness-${tag()}`;
await sql`INSERT INTO sources(id,name,kind,config,tier,participation_mode) VALUES(${source},'Freshness test','rss','{}','T1','editorial')`;
after(async () => { await stopBoss(); await closeDb(); });

test('expired automatic material never enters a processing queue or a paid analysis', async () => {
  const {articleId} = await upsertMaterial({sourceId:source,url:`https://example.com/${tag()}`,title:'Old release',via:'fetch',publishedAt:new Date(Date.now()-72*3600_000),bodyText:'Old source body',bodyStatus:'ok'});
  assert.equal(await queueProcessing(articleId), null);
  assert.equal((await processArticle(articleId)).state, 'skipped');
  const [a] = await sql`SELECT processing_state,processing_error FROM articles WHERE id=${articleId}`;
  assert.equal(a.processing_state, 'skipped');
  assert.equal(a.processing_error, 'freshness: expired');
  const [n] = await sql`SELECT count(*)::int AS n FROM receipts WHERE subject LIKE ${`article:${articleId}%`}`;
  assert.equal(n.n, 0);
});

test('undated automatic material is held without spending, even outside first import', async () => {
  const {articleId} = await upsertMaterial({sourceId:source,url:`https://example.com/${tag()}`,title:'Undated release',via:'fetch',bodyText:'Source body',bodyStatus:'ok'});
  assert.equal(await queueProcessing(articleId), null);
  assert.equal((await processArticle(articleId)).state, 'skipped');
});

test('48 hour boundary and future source dates are checked against source time', () => {
  const now=new Date('2026-10-02T00:00:00Z');
  assert.equal(freshnessReason(new Date(+now-48*3600_000),now),null);
  assert.equal(freshnessReason(new Date(+now-48*3600_000-1),now),'expired');
  assert.equal(freshnessReason(new Date(+now+2*3600_000),now),'future');
});

test('regular RSS collection stores fresh items only and never revises archived items', async () => {
  const base=`https://example.com/${tag()}`;
  const oldDate=new Date(Date.now()-72*3600_000);
  const {articleId}=await upsertMaterial({sourceId:source,url:`${base}/old`,title:'Archived original',via:'fetch',publishedAt:oldDate});
  const server=http.createServer((_req,res)=>{
    res.writeHead(200,{'content-type':'application/rss+xml'});
    res.end(`<rss version="2.0"><channel><title>Test</title>${[
      ['fresh',new Date().toUTCString()],['old',oldDate.toUTCString()],['undated','']
    ].map(([name,date])=>`<item><title>${name}</title><link>${base}/${name}</link>${date?`<pubDate>${date}</pubDate>`:''}<description>Source summary</description></item>`).join('')}</channel></rss>`);
  });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  config.allowPrivateNetworkFetch=true;
  try {
    const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
    await sql`UPDATE sources SET config=${sql.json({feedUrl:url})},cursor=${sql.json({initializedAt:new Date().toISOString()})} WHERE id=${source}`;
    const result=await collectSource(source,{force:true});
    assert.equal(result.status,'ok',result.error ?? 'collection should succeed');
    assert.equal(result.created,1);
    assert.equal(result.revised,0);
    const [a]=await sql`SELECT title,revision FROM articles WHERE id=${articleId}`;
    assert.equal(a.title,'Archived original');
    assert.equal(a.revision,1);
    const [run]=await sql`SELECT detail FROM fetch_runs WHERE source_id=${source} ORDER BY id DESC LIMIT 1`;
    assert.deepEqual(run.detail.freshness.skipped,{expired:1,undated:1,future:0});
    const [unknown]=await sql`SELECT count(*)::int AS n FROM articles WHERE url=${`${base}/undated`}`;
    assert.equal(unknown.n,0);
  } finally {await new Promise<void>(r=>server.close(()=>r()));}
});
