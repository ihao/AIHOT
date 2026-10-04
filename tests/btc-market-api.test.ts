import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { sql, closeDb } from "@aihot/backend/db";
import { buildApp } from "../apps/api/src/app.ts";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { proposeReview } from "@aihot/backend/editorial/review";
import { decideArticleReview } from "@aihot/backend/editorial/decision";

const app = await buildApp();
after(async () => { await app.close(); await closeDb(); });

test("BTC site API reports an empty quote without contacting upstream", async () => {
  const res = await app.inject({ method: "GET", url: "/api/site/market/btc" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.deepEqual(res.json(), { quote: null });
});

test("BTC API and news projections keep the original USD quote after a newer quote arrives", async () => {
  const source = `btc-api-${tag()}`;
  const quoteIds: number[] = [];
  let id: string | undefined;
  let storyId: number | undefined;
  await sql`INSERT INTO sources (id,name,kind,participation_mode,next_fetch_at) VALUES (${source}, 'BTC API fixture','rss','editorial','2100-01-01')`;
  try {
    const [q] = await sql<{ id: number }[]>`INSERT INTO btc_usd_quotes (price_usd,trade_id,quoted_at,fetched_at)
      VALUES (61000.25,123,clock_timestamp() - interval '1 second',clock_timestamp()) RETURNING id`;
    quoteIds.push(q!.id);
    id = (await upsertMaterial({ sourceId: source, url: `https://example.com/${source}`, title: 'BTC fixture', bodyText: 'BTC news', via: 'fetch' })).articleId;
    await sql`INSERT INTO analyses (article_id,input_revision,origin,relevance,title_zh,summary_zh,category)
      VALUES (${id},1,'rule','pass','测试新闻','测试摘要','infrastructure')`;
    await sql`UPDATE articles SET processing_state='analyzed' WHERE id=${id}`;
    const proposal = await proposeReview(id);
    assert.ok(proposal);
    const [review] = await sql<{version:number}[]>`SELECT version FROM editorial_reviews WHERE article_id=${id}`;
    await decideArticleReview(id, {status:'approved',curated:true,fingerprint:proposal.fingerprint,version:review!.version,reason:'BTC local fixture'}, 'btc-test');
    const storyPublicId = randomUUID(), factPublicId = `btc-fact-${tag()}`;
    const [story] = await sql<{id:number}[]>`INSERT INTO stories (public_id,title) VALUES (${storyPublicId},'测试事件') RETURNING id`;
    storyId = story!.id;
    const [fact] = await sql<{id:number}[]>`INSERT INTO facts (public_id,story_id,title) VALUES (${factPublicId},${storyId},'测试事实') RETURNING id`;
    await sql`INSERT INTO fact_articles (fact_id,article_id,role) VALUES (${fact!.id},${id},'report')`;
    const [newer] = await sql<{ id: number }[]>`INSERT INTO btc_usd_quotes (price_usd,trade_id,quoted_at,fetched_at)
      VALUES (63000.5,124,clock_timestamp(),clock_timestamp()) RETURNING id`;
    quoteIds.push(newer!.id);
    const res = await app.inject({ method:'GET', url:'/api/site/market/btc' });
    assert.equal(res.statusCode,200);
    assert.equal(res.headers['cache-control'],'no-store');
    assert.equal(res.json().quote.priceUsd,63000.5);
    assert.equal(res.json().quote.currency,'USD');
    assert.equal(res.json().quote.source,'Coinbase');
    const detail = await app.inject({ method:'GET',url:`/api/site/items/${id}` });
    assert.equal(detail.statusCode,200);
    assert.equal(detail.json().btcAtIngestion.priceUsd,61000.25);
    const pool = await app.inject({ method:'GET',url:'/api/site/pool' });
    assert.equal(pool.statusCode,200);
    assert.equal(pool.json().items.find((item: { id:string }) => item.id === id).btcAtIngestion.priceUsd,61000.25);
    const storyResponse = await app.inject({ method:'GET',url:`/api/site/stories/${storyPublicId}` });
    assert.equal(storyResponse.statusCode,200);
    assert.equal(storyResponse.json().timeline[0].btcAtIngestion.priceUsd,61000.25);
    const group = await app.inject({ method:'GET',url:`/api/site/groups/${factPublicId}/reports` });
    assert.equal(group.statusCode,200);
    assert.equal(group.json().reports[0].btcAtIngestion.priceUsd,61000.25);
  } finally {
    if (id) await sql`DELETE FROM articles WHERE id=${id}`;
    if (storyId) {
      await sql`DELETE FROM facts WHERE story_id=${storyId}`;
      await sql`DELETE FROM stories WHERE id=${storyId}`;
    }
    await sql`DELETE FROM sources WHERE id=${source}`;
    if (quoteIds.length) await sql`DELETE FROM btc_usd_quotes WHERE id IN ${sql(quoteIds)}`;
  }
});
