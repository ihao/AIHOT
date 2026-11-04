import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { SITE, EDITION_TIMES, ABOUT } from "@aihot/site";
import { CATEGORIES, TOPIC_TAGS } from "@aihot/industry/taxonomy";
import { migrationPlan } from "../scripts/migration-safety.ts";

test("upstream site configuration preserves the established 9BTC identity and uses the upstream daily edition time", () => {
  assert.equal(SITE.name, "9BTC");
  assert.equal(SITE.subject, "Web3");
  assert.equal(SITE.mcpPrefix, "ninebtc");
  assert.equal(SITE.organization, null);
  assert.equal(EDITION_TIMES.daily, "08:00");
  assert.equal(SITE.interfaceVersion, "4.0.0");
  assert.match(ABOUT.steps.publish, /08:00/);
});

test("the upstream engine receives stable Web3 categories, topics and the saved source expansion", () => {
  assert.deepEqual(CATEGORIES.map(c => c.key), ["infrastructure", "defi", "stablecoin-rwa", "security", "policy", "industry", "research"]);
  assert.ok(TOPIC_TAGS.includes("预测市场" as never));
  const { sources } = JSON.parse(readFileSync(new URL("../industry/sources.json", import.meta.url), "utf8"));
  assert.equal(sources.length, 109);
  assert.equal(new Set(sources.map((s: { id: string }) => s.id)).size, sources.length);
  assert.ok(sources.every((s: { site_fulltext?: boolean; syndicate_fulltext?: boolean }) => !s.site_fulltext && !s.syndicate_fulltext));
});

test("new 9BTC migrations use one supported online DDL and never hide below the historical cutoff", () => {
  assert.equal(existsSync(new URL("../database/migrations/0050_z9btc_model_price_evidence.sql", import.meta.url)), false);
  for (const file of ["0084_articles_manual_processing.sql", "0085_ninebtc_model_price_evidence.sql"]) {
    assert.deepEqual(migrationPlan(readFileSync(new URL(`../database/migrations/${file}`, import.meta.url), "utf8")), { kind: "transaction" });
  }
});
