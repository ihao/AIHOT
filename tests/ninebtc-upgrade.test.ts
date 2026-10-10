import "./setup.ts";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import postgres from "postgres";
import { runMigrations } from "../scripts/migrate.ts";
import { REPO_ROOT } from "@aihot/backend/config";

test("the production 47-migration baseline upgrades without losing money history, source settings or BTC bindings", async () => {
  const url = new URL(process.env.DATABASE_URL!);
  const name = url.pathname.slice(1) + "_upgrade_test";
  const adminUrl = new URL(url); adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
  await admin`CREATE DATABASE ${admin(name)}`;
  url.pathname = `/${name}`;
  const db = postgres(url.toString(), { max: 1, onnotice: () => {}, types: {
    numeric: { to: 1700, from: [1700], serialize: String, parse: Number },
  } });
  const legacy = mkdtempSync(path.join(tmpdir(), "ninebtc-legacy-"));
  try {
    const { migrations } = JSON.parse(readFileSync(path.join(REPO_ROOT, "docs/research/2026-10-09-main-feature-comparison/production-snapshot.json"), "utf8"));
    assert.equal(migrations.length, 47);
    mkdirSync(path.join(legacy, "database/migrations"), { recursive: true });
    for (const name of migrations) copyFileSync(path.join(REPO_ROOT, "database/migrations", name), path.join(legacy, "database/migrations", name));
    assert.equal(await runMigrations(db, legacy), 47);
    await db`UPDATE model_cost_policy SET enabled = true, day_limit_cny = 7, rolling_limit_cny = 8 WHERE id = 1`;
    await db`INSERT INTO service_prices (service, model, currency, input_per_mtok, output_per_mtok, per_request, verified_on, source_url, note)
      VALUES ('dashscope', 'upgrade-fixture', 'CNY', 2, 3, 0.01, '2026-10-09', 'https://example.invalid/price', 'operator evidence')`;
    await db`INSERT INTO sources (id, name, kind, enabled, site_fulltext, syndicate_fulltext, config)
      VALUES ('upgrade', 'Upgrade source', 'rss', false, false, false, '{"url":"https://example.invalid/feed"}')`;
    const [quote] = await db`INSERT INTO btc_usd_quotes (price_usd, trade_id, quoted_at, fetched_at) VALUES (60000, 123, now(), now()) RETURNING id`;
    await db`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at, btc_quote_id, ingested_at)
      VALUES ('upgrade-article', 'upgrade', 'upgrade-article', 'https://example.invalid/item', 'Saved material', now(), now(), ${quote!.id}, now())`;
    const [receipt] = await db`INSERT INTO receipts (logical_key, service, model, purpose, subject, status) VALUES ('upgrade-money', 'dashscope', 'upgrade-fixture', 'score_article', 'article:upgrade-article@1', 'unknown') RETURNING id`;
    await db`INSERT INTO receipt_attempts (receipt_id, attempt, service, model, status, model_cost_reserved_cny, model_cost_cny, model_cost_state)
      VALUES (${receipt!.id}, 1, 'dashscope', 'upgrade-fixture', 'unknown', 0.5, 0.5, 'retained')`;
    const budget = (await db`SELECT * FROM budgets WHERE service = 'dashscope'`)[0];
    const interrupted = path.join(legacy, "interrupted");
    mkdirSync(path.join(interrupted, "site"), { recursive: true });
    mkdirSync(path.join(interrupted, "database/migrations"), { recursive: true });
    copyFileSync(path.join(REPO_ROOT, "site/migrations.ts"), path.join(interrupted, "site/migrations.ts"));
    copyFileSync(path.join(REPO_ROOT, "database/migrations/0085_ninebtc_model_price_evidence.sql"), path.join(interrupted, "database/migrations/0085_ninebtc_model_price_evidence.sql"));
    writeFileSync(path.join(interrupted, "database/migrations/0051_drop_unused_state.sql"), "ALTER TABLE upgrade_preflight_missing ADD COLUMN flag text;");
    await assert.rejects(runMigrations(db, interrupted), /0051_drop_unused_state/);
    assert.equal((await db`SELECT to_regclass('ninebtc_model_price_evidence') AS name`)[0]!.name, null, "price preflight rolls back with the failed historical migration");
    assert.equal((await db`SELECT count(*)::int AS n FROM schema_migrations`)[0]!.n, 47);
    assert.equal((await db`SELECT verified_on::text FROM service_prices WHERE model = 'upgrade-fixture'`)[0]!.verified_on, "2026-10-09");
    const count = await runMigrations(db, REPO_ROOT);
    assert.equal(count, 72 - 47);
    assert.equal((await db`SELECT count(*)::int AS n FROM schema_migrations`)[0]!.n, 72);
    assert.equal(await runMigrations(db, REPO_ROOT), 0, "a second upgrade is a no-op");
    assert.deepEqual((await db`SELECT enabled, day_limit_cny, rolling_limit_cny FROM model_cost_policy WHERE id = 1`)[0], { enabled: true, day_limit_cny: 7, rolling_limit_cny: 8 });
    assert.deepEqual((await db`SELECT per_request, verified_on::text, source_url, note FROM ninebtc_model_price_evidence WHERE model = 'upgrade-fixture'`)[0], { per_request: 0.01, verified_on: "2026-10-09", source_url: "https://example.invalid/price", note: "operator evidence" });
    assert.deepEqual((await db`SELECT * FROM budgets WHERE service = 'dashscope'`)[0], budget);
    assert.equal((await db`SELECT btc_quote_id FROM articles WHERE id = 'upgrade-article'`)[0]!.btc_quote_id, quote!.id);
    assert.equal((await db`SELECT enabled FROM sources WHERE id = 'upgrade'`)[0]!.enabled, false);
    assert.deepEqual((await db`SELECT status, model_cost_cny, model_cost_state FROM receipt_attempts WHERE receipt_id = ${receipt!.id}`)[0], { status: "unknown", model_cost_cny: 0.5, model_cost_state: "retained" });
    assert.equal((await db`SELECT count(*)::int AS n FROM schema_migrations WHERE name IN ${db(migrations)}`)[0]!.n, 47);
  } finally {
    await db.end();
    await admin`DROP DATABASE ${admin(name)} WITH (FORCE)`;
    await admin.end();
    rmSync(legacy, { recursive: true, force: true });
  }
});
