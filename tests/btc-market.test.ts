import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { installModules } from "@aihot/backend/modules";
import { marketModule } from "../modules/ninebtc-market/server.ts";
import { closeDb, sql, type Db, type Tx } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { toFeedItemSummary, toItemSummary } from "@aihot/backend/publication/items";
import type { GuardedResponse } from "@aihot/backend/lib/http-fetch";


const SOURCE = `btc-market-${tag()}`;
const priorCollect = process.env.COLLECT_ENABLED;
before(async () => {
  process.env.COLLECT_ENABLED = "true";
  installModules([marketModule]);
  await sql`INSERT INTO sources (id, name, kind, next_fetch_at) VALUES (${SOURCE}, 'BTC fixture', 'rss', '2100-01-01')`;
});
after(async () => {
  if (priorCollect === undefined) delete process.env.COLLECT_ENABLED;
  else process.env.COLLECT_ENABLED = priorCollect;
  installModules([]);
  await closeDb();
});

async function market() {
  const module = await import("../modules/ninebtc-market/backend/collect.ts").catch(() => null);
  assert.ok(module, "BTC collection and validation module must exist");
  return module;
}
async function reader() {
  const module = await import("@aihot/backend/publication/market").catch(() => null);
  assert.ok(module, "BTC publication reader must exist");
  return module;
}
async function schemaReady() {
  const columns = await sql<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_name = 'articles'`;
  assert.ok(columns.some((r) => r.column_name === "ingested_at"), "article ingestion migration must exist");
  assert.ok(columns.some((r) => r.column_name === "btc_quote_id"), "article quote reference migration must exist");
}
const rollback = Symbol("test rollback");
async function isolated(run: (db: Tx) => Promise<void>) {
  await schemaReady();
  try { await sql.begin(async (db) => { await run(db); throw rollback; }); }
  catch (error) { if (error !== rollback) throw error; }
}
function response(payload: unknown, status = 200): GuardedResponse {
  const body = Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload));
  return { status, body, url: "https://api.exchange.coinbase.com/products/BTC-USD/ticker", headers: new Headers(), text: () => body.toString("utf8") };
}
const ticker = (at: Date, changes: Record<string, unknown> = {}) => ({ price: "62000.50", trade_id: 123456789, time: at.toISOString(), ...changes });
async function clock(db: Db) { return (await db<{ at: Date }[]>`SELECT clock_timestamp() AS at`)[0]!.at; }
async function quote(db: Db, fetchedAgo = 1000, quotedAgo = 2000, price = 62000.5) {
  const [row] = await db<{ id: number; fetched_at: Date; quoted_at: Date }[]>`
    WITH t AS (SELECT clock_timestamp() AS at)
    INSERT INTO btc_usd_quotes (price_usd, trade_id, fetched_at, quoted_at)
    SELECT ${price}, 123456789, at - ${fetchedAgo} * interval '1 millisecond', at - ${quotedAgo} * interval '1 millisecond' FROM t
    RETURNING id, fetched_at, quoted_at`;
  return row!;
}
async function state(db: Db, id: string) {
  return (await db<{ ingested_at: Date | null; btc_quote_id: number | null; discovered_at: Date; published_at: Date | null; revision: number }[]>`
    SELECT ingested_at, btc_quote_id, discovered_at, published_at, revision FROM articles WHERE id = ${id}`)[0]!;
}
const material = (url = `https://example.com/btc-${tag()}`) => ({ sourceId: SOURCE, url, title: "BTC article", bodyText: "original body", via: "fetch" as const });

test("Coinbase ticker accepts USD price and exchange trade time", async () => {
  const { parseCoinbaseTicker } = await market();
  const now = new Date("2026-10-05T01:00:00Z");
  const parsed = parseCoinbaseTicker(ticker(new Date(now.getTime() - 1000)), now);
  assert.equal(parsed?.priceUsd, 62000.5);
  assert.equal(parsed?.tradeId, 123456789);
  assert.equal(parsed?.quotedAt.toISOString(), "2026-10-05T00:59:59.000Z");
});

test("Coinbase ticker rejects malformed, nonpositive, nonfinite and out-of-bounds prices", async () => {
  const { parseCoinbaseTicker } = await market();
  const now = new Date();
  for (const price of [null, true, [], {}, "", " ", "0", "-1", "Infinity", "NaN", "1e4", "0x10", "123 USD", "1000000000000", Infinity, NaN]) {
    assert.equal(parseCoinbaseTicker(ticker(now, { price }), now), null, `price ${String(price)}`);
  }
});

test("Coinbase ticker rejects invalid or unsafe trade identifiers and dates", async () => {
  const { parseCoinbaseTicker } = await market();
  const now = new Date();
  for (const trade_id of [null, true, {}, "", 0, -1, 1.5, "1e2", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseCoinbaseTicker(ticker(now, { trade_id }), now), null);
  }
  for (const time of [null, 0, "", "yesterday", "2026-02-30T00:00:00Z"]) {
    assert.equal(parseCoinbaseTicker(ticker(now, { time }), now), null);
  }
  for (const payload of [null, [], true, {}, { price: "62000" }]) assert.equal(parseCoinbaseTicker(payload, now), null);
});

test("Coinbase trade time allows exactly five seconds future and five minutes past", async () => {
  const { parseCoinbaseTicker } = await market();
  const now = new Date("2026-10-05T01:00:00Z");
  assert.ok(parseCoinbaseTicker(ticker(new Date(now.getTime() + 5000)), now));
  assert.ok(parseCoinbaseTicker(ticker(new Date(now.getTime() - 300000)), now));
  assert.equal(parseCoinbaseTicker(ticker(new Date(now.getTime() + 5001)), now), null);
  assert.equal(parseCoinbaseTicker(ticker(new Date(now.getTime() - 300001)), now), null);
});

test("successful collection appends quotes even for the same trade using fixed bounded egress fetch", async () => {
  await isolated(async (db) => {
    const { collectBtcUsdQuote } = await market();
    const { getLatestBtcUsdQuote } = await reader();
    const at = await clock(db);
    const requests: Array<{ url: string; options: unknown }> = [];
    const fetch: typeof import("@aihot/backend/lib/http-fetch").guardedFetch = async (url, options) => {
      requests.push({ url, options }); return response(ticker(at));
    };
    const one = await collectBtcUsdQuote({ db, fetch, now: () => at });
    const two = await collectBtcUsdQuote({ db, fetch, now: () => new Date(at.getTime() + 1000) });
    const rows = await db`SELECT id, price_usd, trade_id FROM btc_usd_quotes ORDER BY id`;
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0]!.id, rows[1]!.id);
    assert.equal(one?.priceUsd, 62000.5);
    assert.equal(two?.currency, "USD");
    assert.equal(two?.source, "Coinbase");
    assert.deepEqual(await getLatestBtcUsdQuote(db), two);
    assert.equal(requests[0]!.url, "https://api.exchange.coinbase.com/products/BTC-USD/ticker");
    assert.deepEqual(requests[0]!.options, { timeoutMs: 10000, maxBytes: 16384, maxRedirects: 0, route: "egress", headers: { accept: "application/json" } });
  });
});

test("failed or invalid collection preserves the last quote without appending", async () => {
  await isolated(async (db) => {
    const { collectBtcUsdQuote } = await market();
    const { getLatestBtcUsdQuote } = await reader();
    await quote(db);
    const prior = await getLatestBtcUsdQuote(db);
    for (const fetch of [
      async () => response({}, 429), async () => response({}, 500), async () => response("{broken"),
      async () => response(ticker(new Date(), { price: "0" })), async () => { throw new Error("timeout"); },
    ]) {
      await assert.rejects(collectBtcUsdQuote({ db, fetch }));
      assert.deepEqual(await getLatestBtcUsdQuote(db), prior);
    }
    assert.equal((await db`SELECT count(*)::int AS n FROM btc_usd_quotes`)[0]!.n, 1);
  });
});

test("collection off at runtime performs no HTTP request or database write", async () => {
  const { collectBtcUsdQuote } = await market();
  process.env.COLLECT_ENABLED = "false";
  let hits = 0;
  try {
    assert.equal(await collectBtcUsdQuote({ fetch: async () => { hits++; throw new Error("must not fetch"); } }), null);
    assert.equal(hits, 0);
  } finally { process.env.COLLECT_ENABLED = "true"; }
});

test("new article captures real database ingestion time instead of imported discovery or source times", async () => {
  await isolated(async (db) => {
    const saved = await quote(db);
    const before = await clock(db);
    const discoveredAt = new Date("2020-01-02T00:00:00Z");
    const publishedAt = new Date("2020-01-01T00:00:00Z");
    const result = await upsertMaterial({ ...material(), discoveredAt, publishedAt, sourceUpdatedAt: new Date("2020-01-01T12:00:00Z"), via: "import" }, db);
    const row = await state(db, result.articleId);
    const after = await clock(db);
    assert.ok(row.ingested_at && row.ingested_at >= before && row.ingested_at <= after);
    assert.equal(row.discovered_at.toISOString(), discoveredAt.toISOString());
    assert.equal(row.published_at?.toISOString(), publishedAt.toISOString());
    assert.equal(row.btc_quote_id, saved.id);
  });
});

test("ingestion wall clock is newer than the transaction start", async () => {
  await isolated(async (db) => {
    await db`SELECT pg_sleep(0.02)`;
    const floor = await clock(db);
    const result = await upsertMaterial(material(), db);
    assert.ok((await state(db, result.articleId)).ingested_at! >= floor);
  });
});

test("repeat discovery and content revision preserve the initial ingestion quote and time", async () => {
  await isolated(async (db) => {
    const initial = await quote(db, 2000, 3000, 61000);
    const input = material();
    const result = await upsertMaterial(input, db);
    const first = await state(db, result.articleId);
    await quote(db, 0, 0, 63000);
    await upsertMaterial({ ...input, discoveredAt: new Date("2030-01-01") }, db);
    const revised = await upsertMaterial({ ...input, bodyText: "revised body", title: "Changed" }, db);
    const last = await state(db, result.articleId);
    assert.equal(revised.revised, true);
    assert.equal(last.btc_quote_id, initial.id);
    assert.equal(last.ingested_at?.getTime(), first.ingested_at?.getTime());
    assert.equal(last.revision, 2);
  });
});

test("missing first-ingestion quote stays permanently null after a later quote and revision", async () => {
  await isolated(async (db) => {
    const input = material();
    const first = await upsertMaterial(input, db);
    assert.equal((await state(db, first.articleId)).btc_quote_id, null);
    await quote(db);
    await upsertMaterial(input, db);
    await upsertMaterial({ ...input, title: "Later revision" }, db);
    assert.equal((await state(db, first.articleId)).btc_quote_id, null);
  });
});

test("ingestion selects the latest qualifying fetch and rejects stale or future fetched and traded times", async () => {
  await isolated(async (db) => {
    const eligible = await quote(db, 10000, 15000, 61000);
    await quote(db, 1000, 301000, 62000);
    await quote(db, -60000, 1000, 63000);
    await quote(db, 500, -60000, 64000);
    const result = await upsertMaterial(material(), db);
    assert.equal((await state(db, result.articleId)).btc_quote_id, eligible.id);
  });
});

test("five-minute cutoff applies independently to fetch time and trade time", async () => {
  await isolated(async (db) => {
    await quote(db, 301000, 1000);
    await quote(db, 1000, 301000);
    const absent = await upsertMaterial(material(), db);
    assert.equal((await state(db, absent.articleId)).btc_quote_id, null);
    // Leave a full minute for remote test transport; ingestion intentionally uses the live DB clock.
    const valid = await quote(db, 240000, 240000);
    const present = await upsertMaterial(material(), db);
    assert.equal((await state(db, present.articleId)).btc_quote_id, valid.id);
  });
});

test("legacy rows keep unknown ingestion metadata and serialized summaries explicitly include null", async () => {
  await isolated(async (db) => {
    const id = `legacy-btc-${tag()}`;
    await db`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
      VALUES (${id}, ${SOURCE}, ${id}, 'https://example.com/legacy-btc', 'Legacy', now(), now())`;
    await quote(db);
    await upsertMaterial({ ...material("https://example.com/legacy-btc"), identityKey: id, title: "Legacy revised" }, db);
    assert.equal((await state(db, id)).ingested_at, null);
    assert.equal((await state(db, id)).btc_quote_id, null);
    const stub = { id, revision: 1, title: "Legacy", original_title: null, summary: null, reason: null, source_id: SOURCE, source_name: "Legacy", source_kind: "rss", source_icon: null, first_party: false, url: "https://example.com", published_at: null, discovered_at: new Date(), timeline_at: new Date(), category: null, tags: [], score: null, selected: false, channel: "news", story_public_id: null, story_title: null, x_post: null };
    assert.equal(toItemSummary(stub as any).btcAtIngestion, null);
    assert.equal(toFeedItemSummary(stub as any).btcAtIngestion, null);
  });
});

test("public read layer exposes the immutable quote through current item columns and feed shape", async () => {
  await isolated(async (db) => {
    const saved = await quote(db);
    const one = await upsertMaterial(material(), db);
    await db`INSERT INTO publications (article_id, title, source_id, channel, url, discovered_at, timeline_at, sort_at, visibility)
      SELECT id, title, source_id, 'news', url, discovered_at, timeline_at, timeline_at, 'public' FROM articles WHERE id = ${one.articleId}`;
    const { ITEM_COLUMNS, ITEM_FROM } = await import("@aihot/backend/publication/items");
    const [row] = await db`SELECT ${ITEM_COLUMNS} ${ITEM_FROM} WHERE p.article_id = ${one.articleId}`;
    const summary = toItemSummary(row as any);
    assert.deepEqual(summary.btcAtIngestion, { priceUsd: 62000.5, quotedAt: saved.quoted_at.toISOString(), fetchedAt: saved.fetched_at.toISOString(), source: "Coinbase", currency: "USD", ingestedAt: (await state(db, one.articleId)).ingested_at!.toISOString() });
    assert.deepEqual(toFeedItemSummary(row as any).btcAtIngestion, summary.btcAtIngestion);
    assert.equal(toFeedItemSummary(row as any).id, one.articleId);
  });
});

test("concurrent first reports store one permanent quote reference", async () => {
  await schemaReady();
  const saved = await quote(sql);
  const input = material();
  let later: Awaited<ReturnType<typeof quote>> | undefined;
  let articleId: string | undefined;
  try {
  const results = await Promise.all(Array.from({ length: 6 }, () => upsertMaterial(input)));
  articleId = results[0]!.articleId;
  assert.equal(new Set(results.map((r) => r.articleId)).size, 1);
  assert.equal(results.filter((r) => r.created).length, 1);
  const first = await state(sql, results[0]!.articleId);
  assert.equal(first.btc_quote_id, saved.id);
  later = await quote(sql, 0, 0, 64000);
  await upsertMaterial({ ...input, title: "Concurrent result revised" });
  const last = await state(sql, results[0]!.articleId);
  assert.equal(last.btc_quote_id, saved.id);
  assert.equal(last.ingested_at?.getTime(), first.ingested_at?.getTime());
  } finally {
    if (articleId) await sql`DELETE FROM articles WHERE id = ${articleId}`;
    await sql`DELETE FROM btc_usd_quotes WHERE id IN ${sql([saved.id, ...(later ? [later.id] : [])])}`;
  }
});
