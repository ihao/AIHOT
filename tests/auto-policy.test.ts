import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAutoPolicy } from "@aihot/backend/editorial/auto-policy";

const safe = {
  source: {
    enabled: true, tier: "T1", kind: "rss", participationMode: "editorial", firstParty: true,
    ownerEntityId: "bitcoin-core", feedUrl: "https://bitcoincore.org/en/rss/", autoPublicEnabled: true,
  },
  article: {
    url: "https://bitcoincore.org/en/2026/09/30/release-30.1/", title: "Bitcoin Core 30.1 released",
    body: "Bitcoin Core 30.1 is now available. This routine software release updates the desktop client and includes maintenance improvements for supported operating systems.",
    bodyStatus: "ok",
  },
  analysis: {
    relevance: "pass", itemType: "protocol_upgrade", authorRole: "principal", score: 35,
    titleZh: "Bitcoin Core 30.1 软件版本发布", summaryZh: "Bitcoin Core 发布 30.1 软件版本，更新了客户端中的常规功能。",
  },
};

test("only a routine first-party software release on its verified source domain enters the auto lane", () => {
  assert.equal(evaluateAutoPolicy(safe).admit, true);
  assert.equal(evaluateAutoPolicy({ ...safe, source: { ...safe.source, autoPublicEnabled: false } }).admit, false);
  assert.equal(evaluateAutoPolicy({ ...safe, source: { ...safe.source, firstParty: false } }).admit, false);
  assert.equal(evaluateAutoPolicy({ ...safe, source: { ...safe.source, ownerEntityId: null } }).admit, false);
  assert.equal(evaluateAutoPolicy({ ...safe, article: { ...safe.article, url: "https://example.org/release-30.1/" } }).admit, false);
  assert.equal(evaluateAutoPolicy({ ...safe, analysis: { ...safe.analysis, itemType: undefined } }).admit, false);
});

test("safety, regulation, proposals and financial claims stay pending regardless of model type", () => {
  for (const term of ["CVE-2026-1234", "exploit", "SEC lawsuit", "governance proposal", "stablecoin APY 10%", "安全漏洞", "监管处罚", "收益承诺"]) {
    const material = { ...safe, article: { ...safe.article, body: `${safe.article.body} ${term}` } };
    assert.equal(evaluateAutoPolicy(material).admit, false, term);
  }
  assert.equal(evaluateAutoPolicy({ ...safe, analysis: { ...safe.analysis, score: 80 } }).admit, false);
  assert.equal(evaluateAutoPolicy({ ...safe, analysis: { ...safe.analysis, summaryZh: "" } }).admit, false);
});
