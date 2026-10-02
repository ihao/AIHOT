import assert from "node:assert/strict";
import { test } from "node:test";
import { fingerprintReviewTarget } from "@aihot/backend/editorial/review";

const target = () => ({
  article: { id: "article-1", revision: 1, title: "Release", body_text: "Original material" },
  source: { id: "source-1", name: "Official", site_fulltext: false },
  analysis: { id: 10, input_revision: 1, title_zh: "中文标题", summary_zh: "中文摘要" },
  translation: { body_text: "完整中文译文" },
  quoteTranslation: null,
  override: null,
  sourcePolicyVersion: 0,
});

test("fingerprint is stable across object key ordering", () => {
  const a = target();
  const b = { ...target(), article: { body_text: "Original material", title: "Release", revision: 1, id: "article-1" } };
  assert.equal(fingerprintReviewTarget(a), fingerprintReviewTarget(b));
});

test("fingerprint changes when any approval input changes", () => {
  const original = fingerprintReviewTarget(target());
  for (const changed of [
    { ...target(), article: { ...target().article, body_text: "Changed body" } },
    { ...target(), analysis: { ...target().analysis, id: 11 } },
    { ...target(), override: { version: 1, fields: { summary: "编辑修改" } } },
    { ...target(), source: { ...target().source, site_fulltext: true } },
    { ...target(), sourcePolicyVersion: 1 },
    { ...target(), translation: { body_text: "被修改的中文译文" } },
    { ...target(), quoteTranslation: { text_zh: "引用的译文" } },
  ]) assert.notEqual(fingerprintReviewTarget(changed), original);
});
