import { tag } from "./setup.ts";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { sql, closeDb } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { buildApp } from "../apps/api/src/app.ts";
import { marketModule } from "../modules/ninebtc-market/server.ts";

installModules([marketModule]);
const app = await buildApp();
after(async () => { await app.close(); installModules([]); await closeDb(); });

test("BTC endpoints read empty storage and respect ETag without collection", async () => {
  const old = process.env.COLLECT_ENABLED;
  process.env.COLLECT_ENABLED = "false";
  try {
    for (const url of ["/api/v1/market/btc-usd", "/api/site/market/btc"]) {
      const res = await app.inject({ method: "GET", url });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), { quote: null });
      assert.equal(res.headers["cache-control"], "public, max-age=60");
      const unchanged = await app.inject({ method: "GET", url, headers: { "if-none-match": String(res.headers.etag) } });
      assert.equal(unchanged.statusCode, 304);
      assert.equal(unchanged.body, "");
    }
    assert.equal(Number((await sql`SELECT count(*) FROM btc_usd_quotes`)[0].count), 0);
  } finally { if (old === undefined) delete process.env.COLLECT_ENABLED; else process.env.COLLECT_ENABLED = old; }
});

test("new market quote cannot alter an article's ingestion quote or grant publication", async () => {
  const source = `btc-api-${tag()}`;
  await sql`INSERT INTO sources (id,name,kind,participation_mode,next_fetch_at) VALUES (${source}, 'BTC API fixture','rss','editorial','2100-01-01')`;
  await sql`INSERT INTO btc_usd_quotes (price_usd,trade_id,quoted_at,fetched_at)
      VALUES (61000.25,123,clock_timestamp() - interval '1 second',clock_timestamp())`;
  const id = (await upsertMaterial({ sourceId: source, url: `https://example.com/${source}`, title: "BTC fixture", bodyText: "BTC news", via: "fetch", publishedAt: new Date() })).articleId;
  const privateItem = await app.inject({ method: "GET", url: `/api/site/items/${id}` });
  assert.equal(privateItem.statusCode, 404, "the market quote grants no public authority");
  await sql`INSERT INTO analyses (article_id,input_revision,origin,relevance,title_zh,summary_zh,category,selected,score)
      VALUES (${id},1,'rule','pass','比特币测试新闻','比特币测试摘要','infrastructure',false,70)`;
  await sql`UPDATE articles SET grouping_status='complete' WHERE id=${id}`;
  const storyPublicId = randomUUID();
  const factPublicId = `btc-fact-${tag()}`;
  const [story] = await sql<{ id: number }[]>`INSERT INTO stories (public_id,title,first_report_at,latest_at)
    VALUES (${storyPublicId},'比特币测试事件',now(),now()) RETURNING id`;
  const [fact] = await sql<{ id: number }[]>`INSERT INTO facts (public_id,story_id,title)
    VALUES (${factPublicId},${story.id},'比特币测试事实') RETURNING id`;
  await sql`INSERT INTO fact_articles (fact_id,article_id,role) VALUES (${fact.id},${id},'report')`;
  await publishArticle(id, { releasedAt: new Date(Date.now() - 60000) });
  await sql`INSERT INTO btc_usd_quotes (price_usd,trade_id,quoted_at,fetched_at)
      VALUES (63000.5,124,clock_timestamp(),clock_timestamp())`;
  const current = await app.inject({ method: "GET", url: "/api/v1/market/btc-usd" });
  assert.equal(current.statusCode, 200);
  assert.equal(current.json().quote.priceUsd, 63000.5);
  const detail = await app.inject({ method: "GET", url: `/api/site/items/${id}` });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().btcAtIngestion.priceUsd, 61000.25);
  assert.equal(detail.json().btcAtIngestion.currency, "USD");
  const pool = await app.inject({ method: "GET", url: "/api/site/pool" });
  assert.equal(pool.statusCode, 200);
  assert.equal(pool.json().items.find((item: { id: string }) => item.id === id).btcAtIngestion.priceUsd, 61000.25);
  const reports = await app.inject({ method: "GET", url: `/api/site/groups/${factPublicId}/reports` });
  assert.equal(reports.statusCode, 200);
  assert.equal(reports.json().reports[0].btcAtIngestion.priceUsd, 61000.25);
  const event = await app.inject({ method: "GET", url: `/api/site/stories/${storyPublicId}` });
  assert.equal(event.statusCode, 200);
  assert.equal(event.json().timeline[0].btcAtIngestion.priceUsd, 61000.25);
});
