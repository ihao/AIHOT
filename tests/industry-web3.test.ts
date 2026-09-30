import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { ABOUT, SITE } from "@aihot/industry/site";
import { FEATURES } from "@aihot/industry/features";
import { CATEGORIES, CATEGORY_BY_ITEM_TYPE, CATEGORY_TAGS, ENTITIES, ENTITY_TAGS, IDENTITY_LEXICON, ITEM_TYPES, TOPIC_TAGS } from "@aihot/industry/taxonomy";
import { enforceIdentity, matchEntityIds } from "@aihot/backend/editorial/writing";

test("site uses the 9BTC Web3 identity and disables AI-only modules", () => {
  assert.equal(SITE.name, "9BTC");
  assert.equal(SITE.subject, "Web3");
  assert.equal(SITE.mcpPrefix, "ninebtc");
  assert.equal(SITE.crawlerName, "9BTCBot");
  assert.match(ABOUT.headline.join(""), /Web3/i);
  assert.match(ABOUT.lead, /原文链接/);
  assert.doesNotMatch(ABOUT.steps.publish, /\b\d{1,2}[:：]\d{2}\b|每天.{0,8}(?:早上|上午|下午|晚上)/);
  assert.equal(FEATURES.leaderboard, false);
  assert.equal(FEATURES.codexResetMonitor, false);
});

test("asset price mentions cannot authorize network identity claims", () => {
  const cases = [
    { asset: "Bitcoin", network: "Bitcoin network", zh: "比特币网络", id: "bitcoin" },
    { asset: "Ethereum", network: "Ethereum network", zh: "以太坊网络", id: "ethereum" },
  ];
  for (const { asset, network, zh, id } of cases) {
    assert.deepEqual(matchEntityIds([asset]), [], asset);
    assert.deepEqual(matchEntityIds([network]), [id], network);
    assert.deepEqual(matchEntityIds([zh]), [id], zh);
    const draft = { titleZh: `${zh}完成升级`, summaryZh: `${zh}公布升级时间。` };
    const market = { title: `${asset} price rises`, text: `${asset} market price changed today.`, sourceKind: "rss" };
    assert.equal(enforceIdentity(market, draft).identityGuard.outcome, "fallback", asset);
    const protocol = { title: `${network} upgrade`, text: `${network} published the activation schedule.`, sourceKind: "rss" };
    assert.equal(enforceIdentity(protocol, draft).identityGuard.outcome, "pass", network);
  }
});

test("Web3 categories and topic directory use one consistent vocabulary", () => {
  assert.deepEqual(CATEGORIES.map((c) => c.key), ["infrastructure", "defi", "stablecoin-rwa", "security", "policy", "industry", "research"]);
  assert.deepEqual(CATEGORIES.map((c) => c.label), ["公链与基础设施", "DeFi", "稳定币与 RWA", "安全", "政策与监管", "项目与商业", "研究与数据"]);
  assert.equal(new Set(CATEGORIES.map((c) => c.key)).size, CATEGORIES.length);
  for (const category of CATEGORIES) for (const field of [category.label, category.section, category.guide]) assert.ok(field.trim());
  assert.equal(new Set(ITEM_TYPES).size, ITEM_TYPES.length);
  assert.deepEqual(ITEM_TYPES, ["protocol_upgrade", "defi_product_change", "stablecoin_rwa_event", "security_incident", "policy_event", "governance_business_change", "research_analysis"]);
  assert.deepEqual(Object.keys(CATEGORY_BY_ITEM_TYPE).sort(), [...ITEM_TYPES].sort());
  for (const tag of Object.values(CATEGORY_BY_ITEM_TYPE)) assert.ok((CATEGORY_TAGS as readonly string[]).includes(tag), tag);
  assert.deepEqual(Object.keys(ENTITIES), ["bitcoin", "ethereum", "solana", "uniswap", "aave", "chainlink", "sec", "cftc"]);
  for (const asset of ["BTC", "ETH", "SOL"]) {
    assert.ok(!Object.values(ENTITIES).some((entity) => entity.aliases.includes(asset)), asset);
    assert.ok(!IDENTITY_LEXICON.some((entity) => entity.patterns.some((pattern) => pattern.test(asset))), asset);
  }

  const directory = JSON.parse(readFileSync(new URL("../industry/topics.json", import.meta.url), "utf8")) as {
    groups: Array<{ key: string; name: string; blurb: string }>;
    topics: Array<{ slug: string; group: string; entityId?: string; tags: string[]; definition: string; related: string[] }>;
  };
  assert.deepEqual(directory.groups.map((g) => g.key), ["company", "field", "genre"]);
  assert.deepEqual(directory.topics.map((t) => t.slug), ["bitcoin", "ethereum", "solana", "defi", "stablecoins", "security", "regulation", "research"]);
  assert.equal(new Set(directory.topics.map((t) => t.slug)).size, directory.topics.length);
  const slugs = new Set(directory.topics.map((t) => t.slug));
  const groupKeys = new Set(directory.groups.map((g) => g.key));
  const allowedTags = new Set<string>([...CATEGORY_TAGS, ...TOPIC_TAGS, ...ENTITY_TAGS]);
  for (const topic of directory.topics) {
    assert.ok(groupKeys.has(topic.group), topic.slug);
    assert.ok(topic.definition.trim(), topic.slug);
    if (topic.entityId) assert.ok(ENTITIES[topic.entityId], topic.slug);
    assert.ok(topic.tags.length > 0, topic.slug);
    for (const tag of topic.tags) {
      if (tag.startsWith("entity:")) assert.ok(ENTITIES[tag.slice(7)], `${topic.slug}: ${tag}`);
      else assert.ok(allowedTags.has(tag), `${topic.slug}: ${tag}`);
    }
    for (const related of topic.related) assert.ok(slugs.has(related), `${topic.slug}: ${related}`);
  }
});
