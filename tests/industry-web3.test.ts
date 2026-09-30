import assert from "node:assert/strict";
import { test } from "node:test";
import { ABOUT, SITE } from "@aihot/industry/site";
import { FEATURES } from "@aihot/industry/features";

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
