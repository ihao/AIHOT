// Regressions: a real zero score is published, UNKNOWN becomes pass after writing, a historical
// rebuild trusts that stale pass, or withdrawing only pool eligibility leaves detail/Markdown public.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { normalizeAnalysis, type AnalysisRun } from "@aihot/backend/editorial/analyze";
import { overrideFields } from "@aihot/backend/admin/content";
import { publishArticle } from "@aihot/backend/publication/publish";
import { loadItemShare } from "@aihot/backend/publication/og";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { groupArticle } from "@aihot/backend/events/group";
import { processArticle } from "@aihot/backend/jobs/content";
import { buildApp } from "../apps/api/src/app.ts";

const key = tag();
const source = `quality-${key}`;
const app = await buildApp();
before(async () => {
  await sql`INSERT INTO sources(id,name,kind,tier,participation_mode,next_fetch_at)
    VALUES (${source},'Quality fixture','rss','T1','editorial','2100-01-01')`;
});
after(async () => { await app.close(); await stopBoss(); await closeDb(); });

async function fixture(name: string, score: number | null, label = "PASS", selected = false) {
  const { articleId: id } = await upsertMaterial({ sourceId: source, url: `https://example.org/${key}/${name}`,
    title: `${key} ${name}`, bodyText: 'Original material retained for audit.', bodyStatus: 'ok', via: 'fetch', publishedAt: new Date() });
  const [receipt] = await sql`INSERT INTO receipts(logical_key,service,purpose,status,response)
    VALUES (${`${key}-${name}`},'dashscope','score_article','completed',${sql.json({ attentionScore: score })}) RETURNING id`;
  await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,title_zh,summary_zh,score,selected,receipt_ids,output)
    VALUES (${id},1,'model','pass',${`标题 ${key} ${name}`},'保留的摘要',${score},${selected},${[Number(receipt!.id)]},
      ${sql.json({ prefilter: { label, reason: 'stored original judgement' }, scores: score === null ? null : [score,score] })})`;
  await sql`UPDATE articles SET grouping_status='complete',selection_adds_value=true WHERE id=${id}`;
  await publishArticle(id, { releasedAt: new Date(Date.now()-60_000) });
  return id;
}

test('UNKNOWN stays unconfirmed even when a stored run has complete copy and high scores', () => {
  const run: AnalysisRun = {
    prefilter: { label: 'UNKNOWN', reason: 'No confirmed Web3 event', model: 'unused', receiptId: 0, reused: true },
    scores: { model: 'unused', threshold: 60, values: [90,90], receiptIds: [], reused: true },
    writing: { kind: 'summarize', model: 'unused', titleZh: '标题', summaryZh: '完整摘要', reasonZh: null, receiptIds: [], reused: true },
    structure: null,
  };
  assert.equal(normalizeAnalysis(run).relevance, 'unknown');
  assert.equal(normalizeAnalysis(run).selected, false);
});

test('zero, nine, missing scores and historical UNKNOWN cannot reach any public article outlet', async () => {
  for (const [name,score,label] of [['zero',0,'PASS'],['nine',9,'PASS'],['unknown',90,'UNKNOWN'],['unscored',null,'PASS']] as const) {
    const id = await fixture(name,score,label);
    const [p] = await sql`SELECT visibility,eligible,selected FROM publications WHERE article_id=${id}`;
    assert.equal(p!.visibility,'withdrawn',name);
    assert.equal(p!.eligible,false,name);
    assert.equal(p!.selected,false,name);
    for (const path of [`/api/site/items/${id}`,`/items/${id}/markdown`]) {
      assert.equal((await app.inject(path)).statusCode,404,`${name}: ${path}`);
    }
    assert.equal(await loadItemShare(id),null,name);
    for (const path of ['/api/site/pool','/api/v1/items?mode=all','/feed/all.xml',
      `/api/v1/agent/search?q=${encodeURIComponent(key)}`,'/sitemap.xml']) {
      assert.ok(!(await app.inject(path)).body.includes(id),`${name}: ${path}`);
    }
    assert.equal((await sql`SELECT body_text FROM articles WHERE id=${id}`)[0]!.body_text,'Original material retained for audit.');
    const savedScore=(await sql`SELECT score FROM analyses WHERE article_id=${id}`)[0]!.score;
    assert.equal(savedScore===null?null:Number(savedScore),score);
    assert.equal((await sql`SELECT count(*)::int AS n FROM receipts WHERE logical_key=${`${key}-${name}`}`)[0]!.n,1);
    const revision=(await sql`SELECT revision FROM publications WHERE article_id=${id}`)[0]!.revision;
    await publishArticle(id);
    assert.equal((await sql`SELECT revision FROM publications WHERE article_id=${id}`)[0]!.revision,revision,'rebuild is idempotent');
  }
});

test('recovered low-value and UNKNOWN analyses do not buy grouping calls or repeatedly queue recovery', async () => {
  for (const [name,score,label] of [['recover-low',9,'PASS'],['recover-unknown',90,'UNKNOWN']] as const) {
    const id=await fixture(name,score,label);
    await sql`UPDATE articles SET grouping_status='pending',grouped_at=NULL WHERE id=${id}`;
    assert.equal((await processArticle(id)).state,'already-analyzed');
    assert.equal((await groupArticle(id)).verdict,'standalone');
    assert.equal((await sql`SELECT count(*)::int AS n FROM receipts WHERE logical_key=${`${key}-${name}`}`)[0]!.n,1);
  }
});

test('ten remains in all, valid selections remain selected and manual zero cannot fall back to a high model score', async () => {
  const ten=await fixture('ten',10);
  const selected=await fixture('selected',90,'PASS',true);
  assert.equal((await app.inject(`/api/site/items/${ten}`)).statusCode,200);
  assert.ok((await app.inject('/api/v1/items?mode=all')).body.includes(ten));
  assert.ok((await app.inject('/api/v1/items?mode=selected')).body.includes(selected));
  await overrideFields(selected,{fields:{score:0},reason:'verified correction',version:0},'test');
  assert.equal((await app.inject(`/api/site/items/${selected}`)).statusCode,404);
  assert.equal((await groupArticle(selected)).verdict,'standalone');
  assert.equal((await sql`SELECT selection_adds_value FROM articles WHERE id=${selected}`)[0]!.selection_adds_value,true,'a withheld group job cannot revoke the saved value judgement');
  assert.equal(Number((await sql`SELECT score FROM analyses WHERE article_id=${selected}`)[0]!.score),90);
  await overrideFields(selected,{fields:{},clear:['score'],reason:'restore saved score',version:1},'test');
  assert.equal((await app.inject(`/api/site/items/${selected}`)).statusCode,200);
  assert.ok((await app.inject('/api/v1/items?mode=selected')).body.includes(selected));
});

test('raising the score of a withheld pending candidate cannot bypass identity confirmation', async () => {
  const id=await fixture('pending-candidate',0,'PASS',true);
  await sql`UPDATE articles SET grouping_status='pending',grouped_at=NULL,selection_adds_value=NULL WHERE id=${id}`;
  await groupArticle(id);
  const [pending]=await sql`SELECT grouping_status,selection_adds_value FROM articles WHERE id=${id}`;
  assert.deepEqual({...pending},{grouping_status:'pending',selection_adds_value:null});
  await overrideFields(id,{fields:{score:90},reason:'confirmed corrected score',version:0},'test');
  const [p]=await sql`SELECT selected,selection_candidate FROM publications WHERE article_id=${id}`;
  assert.deepEqual({...p},{selected:false,selection_candidate:true});
});
