import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { ABOUT, SITE } from "@aihot/industry/site";
import { FEATURES } from "@aihot/industry/features";
import { CATEGORIES, CATEGORY_BY_ITEM_TYPE, CATEGORY_TAGS, ENTITIES, ENTITY_TAGS, IDENTITY_LEXICON, ITEM_TYPES, TOPIC_TAGS } from "@aihot/industry/taxonomy";
import { enforceIdentity, matchEntityIds } from "@aihot/backend/editorial/writing";
import { promptText } from "@aihot/backend/editorial/prompts";
import { BatchSchema, PairSchema, SignalSchema } from "@aihot/backend/events/relate";
import { PeriodSchema, periodPrompt } from "@aihot/backend/reports/compose";

test("grouping prompts render shared guidance and provide examples accepted without schema fallbacks", () => {
  for (const [name, schema] of [["group-pair", PairSchema], ["group-batch", BatchSchema], ["group-signal", SignalSchema]] as const) {
    const rendered = promptText(name);
    assert.doesNotMatch(rendered, /\{\{/);
    for (const partial of ["group-definitions", "group-method"]) assert.ok(rendered.includes(promptText(partial)), `${name}: ${partial}`);
    const examples = [...rendered.matchAll(/^\{.*\}$/gm)].map(([json]) => JSON.parse(json));
    assert.ok(examples.length > 0, `${name}: parseable example required`);
    for (const example of examples) assert.deepEqual(schema.parse(example), example, name);
  }
});

test("period report runtime renders both periods and its example matches the production schema", () => {
  for (const kind of ["weekly", "monthly"] as const) {
    const { system, user } = periodPrompt(kind, "2026-09-01", "2026-09-07", []);
    assert.equal(system, promptText("report-period", { kindName: kind === "weekly" ? "周报" : "月报", overviewLength: kind === "weekly" ? "150–300" : "200–400" }));
    assert.doesNotMatch(system, /\{\{/);
    assert.match(user, /2026-09-01 至 2026-09-07/);
    const examples = [...system.matchAll(/^\{.*\}$/gm)].map(([json]) => JSON.parse(json));
    assert.ok(examples.length > 0);
    for (const example of examples) assert.deepEqual(PeriodSchema.parse(example), example);
  }
  for (const name of ["story-digest", "report-daily-lead", "translate-body", "translate-post"]) assert.doesNotMatch(promptText(name), /\{\{/);
});

test("content understanding enumerates the live item types and a compatible JSON example", () => {
  const prompt = promptText("content-understanding");
  const types = [...prompt.matchAll(/^- `([a-z_]+)`：/gm)].map((match) => match[1]!).filter((type) => !["principal", "observer", "relayer"].includes(type));
  assert.deepEqual(types.sort(), [...ITEM_TYPES].sort());
  const examples = [...prompt.matchAll(/^\{.*\}$/gm)].map(([json]) => JSON.parse(json));
  assert.ok(examples.length > 0, "a parseable output example is required");
  for (const example of examples) {
    assert.deepEqual(Object.keys(example).sort(), ["itemType", "authorRole", "tags", "editorialJudgment", "titleZh", "summaryZh"].sort());
    assert.ok((ITEM_TYPES as readonly string[]).includes(example.itemType));
    assert.equal(example.tags[0], CATEGORY_BY_ITEM_TYPE[example.itemType]);
    assert.ok(["principal", "observer", "relayer"].includes(example.authorRole));
    const allowed = new Set<string>([...CATEGORY_TAGS, ...TOPIC_TAGS, ...ENTITY_TAGS]);
    assert.ok(example.tags.every((tag: string) => allowed.has(tag)));
    for (const key of ["editorialJudgment", "titleZh", "summaryZh"]) assert.equal(typeof example[key], "string");
  }
});

test("structure consumes dynamic vocabulary and preserves its JSON output fields", () => {
  const raw = readFileSync(new URL("../industry/prompts/structure.md", import.meta.url), "utf8");
  const values = Object.fromEntries(["categoryCount", "categoryGuide", "categoryTags", "topicTags", "entityTags", "entities"].map((key) => [key, `CONTRACT_${key}`]));
  for (const key of Object.keys(values)) assert.ok(raw.includes(`{{${key}}}`), key);
  const prompt = promptText("structure", values);
  for (const value of Object.values(values)) assert.ok(prompt.includes(value));
  assert.doesNotMatch(prompt, /\{\{|已确认与 AI/);
  assert.match(prompt, /字段：category, tags, subjects, fact/);
  for (const field of ["title", "subject", "action", "object", "occurredAt"]) assert.match(prompt, new RegExp(`\\b${field}\\b`));
});

test("Web3 score prompt weights cover ITEM_TYPES and preserve the single integer output contract", () => {
  const prompt = promptText("selection-score");
  const rows = prompt.split("\n").filter((line) => /^\|\s*[a-z][a-z_]+\s*\|/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  assert.deepEqual(rows.map(([type]) => type).sort(), [...ITEM_TYPES].sort());
  for (const [type, ...weights] of rows) {
    assert.equal(weights.length, 5, type);
    for (const weight of weights) assert.match(weight, /^\d+$/, `${type}: ${weight}`);
    assert.equal(weights.reduce((sum, weight) => sum + Number(weight), 0), 10, type);
  }
  assert.match(prompt, /\| 类型 \| sig \| nov \| cred \| reson \| act \|/);
  assert.match(prompt, /0–100 的整数/);
  assert.match(prompt, /只返回合法 JSON/);
  assert.match(prompt, /顶层必须且只能包含 `attentionScore`/);
  const examples = [...prompt.matchAll(/^\{.*\}$/gm)].map(([json]) => JSON.parse(json));
  assert.ok(examples.length > 0, "score output example is required");
  for (const example of examples) {
    assert.deepEqual(Object.keys(example), ["attentionScore"]);
    assert.ok(Number.isInteger(example.attentionScore));
    assert.ok(example.attentionScore >= 0 && example.attentionScore <= 100);
  }
});

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
    { asset: "Solana", network: "Solana network", zh: "索拉纳网络", id: "solana" },
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
