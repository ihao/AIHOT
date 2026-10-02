import "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { getEffectiveReview, getReviewProposal, proposeReview, setSourceAutoPublic } from "@aihot/backend/editorial/review";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { tag } from "./setup.ts";

const suffix = tag();
const sourceId = `review-${suffix}`;
const policySourceId = `review-policy-${suffix}`;
let serial = 0;
const quotedTweetId = `${Date.now()}${Math.floor(Math.random() * 100000)}`;

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
            VALUES (${sourceId}, 'Review fixture', 'rss', 'T1', 'editorial', '2100-01-01')`;
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
            VALUES (${policySourceId}, 'Policy fixture', 'rss', 'T1', 'editorial', '2100-01-01')`;
});
after(async () => { await closeDb(); });

async function material() {
  const index = ++serial;
  const { articleId } = await upsertMaterial({
    sourceId, url: `https://example.com/review-${suffix}-${index}`, title: `Release ${index}`,
    bodyText: `Original body ${index}`, bodyHtml: `<p>Original body ${index}</p>`, bodyStatus: "ok", via: "fetch", publishedAt: new Date(),
  });
  return articleId;
}

async function analyze(articleId: string, revision: number) {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
    VALUES (${articleId}, ${revision}, 'rule', 'pass', 'industry', '中文标题', '中文摘要', 70, false) RETURNING id`;
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${articleId}`;
  return row!.id;
}

test("review state and source auto-public policy start closed, including existing public projections", async () => {
  const id = await material();
  await sql`INSERT INTO publications (article_id, title, source_id, channel, url, discovered_at, timeline_at, sort_at, visibility)
            SELECT id, title, source_id, 'news', url, discovered_at, timeline_at, timeline_at, 'public' FROM articles WHERE id = ${id}`;
  const [state] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM editorial_reviews WHERE article_id = ${id}`;
  const [policy] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM source_auto_public_policies WHERE source_id = ${sourceId}`;
  assert.equal(state!.count, 0, "a legacy public projection is never converted into approval");
  assert.equal(policy!.count, 0, "absence means auto-public is off");
  assert.equal(await getReviewProposal(id), null, "a public projection alone is not reviewable");
  const effective = await getEffectiveReview(id);
  assert.deepEqual([effective.status, effective.curated, effective.version], ["pending", false, 0]);
});

test("only a successful analysis of the current article revision can form a proposal", async () => {
  const id = await material();
  await analyze(id, 1);
  const first = await proposeReview(id);
  assert.ok(first);
  assert.equal(first.analysisId > 0, true);
  const [stored] = await sql<{ status: string; fingerprint: string; version: number }[]>`
    SELECT status, fingerprint, version FROM editorial_reviews WHERE article_id = ${id}`;
  assert.deepEqual([stored!.status, stored!.fingerprint, stored!.version], ["pending", first.fingerprint, 1]);
  await sql`UPDATE editorial_reviews SET status = 'approved', reviewed_by = 'editor-test', reviewed_at = now() WHERE article_id = ${id}`;
  assert.equal((await getEffectiveReview(id)).status, "approved");

  await sql`UPDATE articles SET revision = 2, body_text = 'Extracted new body', processing_state = 'new' WHERE id = ${id}`;
  assert.equal(await getReviewProposal(id), null, "an extracted body awaiting reanalysis cannot be approved");
  assert.equal((await getEffectiveReview(id)).status, "pending", "an old grant stops matching immediately");
  assert.equal(await proposeReview(id), null);
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${id}`;
  assert.equal(await getReviewProposal(id), null, "an old analysis arriving late is still stale");
  const newest = await analyze(id, 2);
  const second = await proposeReview(id);
  assert.equal(second?.analysisId, newest);
  assert.notEqual(second?.fingerprint, first.fingerprint);
  assert.equal((await getEffectiveReview(id)).status, "pending");
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh)
            VALUES (${id}, 1, 'rule', 'pass', 'industry', '迟到的旧标题', '迟到的旧摘要')`;
  assert.equal((await getReviewProposal(id))?.analysisId, newest, "a late old run cannot replace the current analysis");
});

test("proposal fingerprint changes with material, override and source attribution or licence", async () => {
  const id = await material();
  await analyze(id, 1);
  const initial = (await getReviewProposal(id))!.fingerprint;
  await sql`UPDATE articles SET body_text = 'A changed extraction under same revision' WHERE id = ${id}`;
  const body = (await getReviewProposal(id))!.fingerprint;
  assert.notEqual(body, initial);
  await sql`INSERT INTO editorial_overrides (article_id, fields, version) VALUES (${id}, ${sql.json({ summary: "编辑摘要" })}, 1)`;
  const override = (await getReviewProposal(id))!.fingerprint;
  assert.notEqual(override, body);
  await sql`UPDATE sources SET site_fulltext = true WHERE id = ${sourceId}`;
  const source = (await getReviewProposal(id))!.fingerprint;
  assert.notEqual(source, override);
  await setSourceAutoPublic(sourceId, { enabled: true, version: 0, reason: "policy fingerprint" }, "editor-test");
  assert.notEqual((await getReviewProposal(id))!.fingerprint, source);
  await setSourceAutoPublic(sourceId, { enabled: false, version: 1, reason: "close again" }, "editor-test");
  const closed = (await getReviewProposal(id))!.fingerprint;
  await sql`INSERT INTO translations (article_id, lang, revision, body_text, body_html, origin)
            VALUES (${id}, 'zh', 1, '初版中文译文', '<p>初版中文译文</p>', 'source')`;
  const translated = (await getReviewProposal(id))!.fingerprint;
  assert.notEqual(translated, closed);
  await sql`UPDATE translations SET body_text = '修改后的中文译文' WHERE article_id = ${id} AND lang = 'zh'`;
  assert.notEqual((await getReviewProposal(id))!.fingerprint, translated);
  await sql`UPDATE articles SET x_post = ${sql.json({ quoted: { url: `https://x.com/test/status/${quotedTweetId}` } })} WHERE id = ${id}`;
  const quoted = (await getReviewProposal(id))!.fingerprint;
  await sql`INSERT INTO quote_translations (tweet_id, text_hash, text_zh) VALUES (${quotedTweetId}, 'hash1', '引用中文译文')`;
  assert.notEqual((await getReviewProposal(id))!.fingerprint, quoted);
});

test("a temporary invalid proposal cannot revive an old approval when content returns", async () => {
  const id = await material();
  await analyze(id, 1);
  const first = await proposeReview(id);
  assert.ok(first);
  await sql`UPDATE editorial_reviews SET status = 'approved', reviewed_by = 'editor-test', reviewed_at = now() WHERE article_id = ${id}`;
  assert.equal((await getEffectiveReview(id)).status, 'approved');
  await sql`UPDATE articles SET processing_state = 'new' WHERE id = ${id}`;
  assert.equal(await proposeReview(id), null);
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${id}`;
  assert.equal((await getReviewProposal(id))?.fingerprint, first.fingerprint, "the same content is back");
  assert.equal((await getEffectiveReview(id)).status, 'pending', "the prior approval must stay revoked");
  const [review] = await sql<{ status: string; version: number }[]>`SELECT status, version FROM editorial_reviews WHERE article_id = ${id}`;
  assert.deepEqual([review!.status, review!.version], ['pending', 2]);
});

test("auto-public allowlist changes require a version and are audited", async () => {
  const enabled = await setSourceAutoPublic(policySourceId, { enabled: true, version: 0, reason: "test enable" }, "editor-test");
  assert.deepEqual([enabled.enabled, enabled.version], [true, 1]);
  await assert.rejects(() => setSourceAutoPublic(policySourceId, { enabled: false, version: 0, reason: "stale" }, "editor-test"), /changed|刷新|版本/);
  const [audit] = await sql<{ actor: string; action: string; reason: string }[]>`
    SELECT actor, action, reason FROM audit_log WHERE subject = ${`source:${policySourceId}`} AND action = 'source.auto_public'
    ORDER BY id DESC LIMIT 1`;
  assert.deepEqual([audit!.actor, audit!.action, audit!.reason], ["editor-test", "source.auto_public", "test enable"]);
  await setSourceAutoPublic(policySourceId, { enabled: false, version: 1, reason: "test close" }, "editor-test");
});
