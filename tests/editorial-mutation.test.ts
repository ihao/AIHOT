import "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { getReviewProposal, proposeReview } from "@aihot/backend/editorial/review";
import { decideArticleReview } from "@aihot/backend/editorial/decision";
import { overrideFields, rerun, setVisibility } from "@aihot/backend/admin/content";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { storeQuoteTranslation, storeTranslation } from "@aihot/backend/editorial/translate";
import { markBodyUnconfirmed } from "@aihot/backend/content/extract";
import { tag } from "./setup.ts";
import { buildApp } from "../apps/api/src/app.ts";

const runTag = tag();
const sourceId = `mutation-${runTag}`;
let serial = 0;
const app = await buildApp();

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, site_fulltext, next_fetch_at)
    VALUES (${sourceId}, 'Mutation fixture', 'rss', 'T1', 'editorial', true, '2100-01-01')`;
});
after(async () => { await app.close(); await stopBoss(); await closeDb(); });

async function approvedFixture(raw?: unknown) {
  const url = `https://example.com/mutation-${runTag}-${++serial}`;
  const material = { sourceId, url, title: `Release ${serial}`, bodyText: `Body ${serial}`, bodyStatus: "ok" as const, via: "fetch" as const, raw };
  const { articleId } = await upsertMaterial(material);
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
    VALUES (${articleId}, 1, 'rule', 'pass', 'industry', '发布测试', '有证据的摘要', 80, true)`;
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${articleId}`;
  const proposal = await proposeReview(articleId);
  assert.ok(proposal);
  await decideArticleReview(articleId, { status: "approved", curated: true, fingerprint: proposal.fingerprint, version: 1, reason: "checked" }, "editor");
  return { articleId, material, proposal };
}

async function state(articleId: string) {
  const [row] = await sql<{ visibility: string; selected: boolean; selected_ready_at: Date | null; review_status: string; review_version: number }[]>`
    SELECT p.visibility, p.selected, p.selected_ready_at, r.status AS review_status, r.version AS review_version
    FROM publications p JOIN editorial_reviews r ON r.article_id = p.article_id WHERE p.article_id = ${articleId}`;
  assert.ok(row);
  return row;
}

test("a revised source material closes public projection and selected ledger in the same commit", async () => {
  const { articleId, material } = await approvedFixture();
  assert.deepEqual([(await state(articleId)).visibility, (await state(articleId)).selected], ["public", true]);
  const changed = await sql.begin(async (tx) => {
    const result = await upsertMaterial({ ...material, bodyText: "Updated material fact" }, tx);
    const [inside] = await tx<{ visibility: string }[]>`SELECT visibility FROM publications WHERE article_id = ${articleId}`;
    const [outside] = await sql<{ visibility: string }[]>`SELECT visibility FROM publications WHERE article_id = ${articleId}`;
    assert.equal(inside?.visibility, "withdrawn", "the writer's transaction closes the projection");
    assert.equal(outside?.visibility, "public", "other readers see the old snapshot until commit");
    return result;
  });
  assert.equal(changed.revised, true);
  assert.deepEqual([(await state(articleId)).visibility, (await state(articleId)).selected, (await state(articleId)).review_status], ["withdrawn", false, "pending"]);
  assert.equal((await state(articleId)).selected_ready_at, null);
  const [ledger] = await sql<{ op: string }[]>`SELECT op FROM selected_ledger WHERE article_id = ${articleId} ORDER BY seq DESC LIMIT 1`;
  assert.equal(ledger?.op, "remove");
  assert.equal((await app.inject({ method: "GET", url: `/api/site/items/${articleId}` })).statusCode, 404);
});

test("a publicly approved B reverting to previously seen A is a new revision and loses B's grant", async () => {
  const { articleId, material } = await approvedFixture();
  const changed = await upsertMaterial({ ...material, title: "Corrected release" });
  assert.equal(changed.revised, true);
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
    VALUES (${articleId}, 2, 'rule', 'pass', 'industry', '修订发布', '修订摘要', 80, true)`;
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${articleId}`;
  const b = await proposeReview(articleId);
  assert.ok(b);
  const [review] = await sql<{ version: number }[]>`SELECT version FROM editorial_reviews WHERE article_id = ${articleId}`;
  await decideArticleReview(articleId, { status: "approved", curated: true, fingerprint: b.fingerprint, version: review!.version, reason: "B checked" }, "editor");
  assert.equal((await state(articleId)).visibility, "public");

  const reverted = await upsertMaterial(material);
  assert.equal(reverted.revised, true);
  const [article] = await sql<{ title: string; revision: number }[]>`SELECT title, revision FROM articles WHERE id = ${articleId}`;
  assert.deepEqual([article?.title, article?.revision], [material.title, 3]);
  assert.deepEqual([(await state(articleId)).visibility, (await state(articleId)).review_status], ["withdrawn", "pending"]);
});

test("new body translation and shared quote translation revoke their exact approved articles", async () => {
  const first = await approvedFixture();
  await storeTranslation(first.articleId, 1, "发布测试", "<p>新译文</p>", "新译文", true);
  assert.equal((await state(first.articleId)).visibility, "withdrawn");
  assert.equal((await app.inject({ method: "GET", url: `/api/site/items/${first.articleId}` })).statusCode, 404);

  const tweetId = `${Date.now()}${++serial}`;
  const { articleId } = await upsertMaterial({
    sourceId, url: `https://x.com/test/status/${Date.now()}${++serial}`, title: "A quoted post", bodyText: "Original post text",
    bodyStatus: "ok", via: "fetch", language: "en", xPost: {
      tweetId: `${Date.now()}${++serial}`, authorName: "Source", handle: "source", text: "Original post text",
      quoted: { authorName: "Quoted", handle: "quoted", text: "An original quote", url: `https://x.com/quoted/status/${tweetId}` },
    },
  });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
    VALUES (${articleId}, 1, 'rule', 'pass', 'industry', '引用测试', '有证据的摘要', 80, true)`;
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${articleId}`;
  const proposal = await proposeReview(articleId);
  assert.ok(proposal);
  await decideArticleReview(articleId, { status: "approved", curated: true, fingerprint: proposal.fingerprint, version: 1, reason: "checked" }, "editor");
  await storeQuoteTranslation(tweetId, "hash", "新引用译文", "model");
  assert.deepEqual([(await state(articleId)).visibility, (await state(articleId)).selected], ["withdrawn", false]);
  assert.equal((await app.inject({ method: "GET", url: `/api/site/items/${articleId}` })).statusCode, 404);
});

test("manual edit and restoring the old text never revive its former approval", async () => {
  const { articleId, proposal } = await approvedFixture();
  await overrideFields(articleId, { fields: { title: "修订 A" }, reason: "correction", version: 0 }, "editor");
  assert.deepEqual([(await state(articleId)).visibility, (await state(articleId)).review_status], ["withdrawn", "pending"]);
  await overrideFields(articleId, { fields: {}, clear: ["title"], reason: "restore", version: 1 }, "editor");
  assert.deepEqual([(await state(articleId)).visibility, (await state(articleId)).review_status], ["withdrawn", "pending"]);
  const next = await proposeReview(articleId);
  assert.ok(next);
  assert.notEqual(next.fingerprint, proposal.fingerprint);
});

test("setVisibility(public) does not restore an unreviewed item", async () => {
  const { articleId } = await approvedFixture();
  await setVisibility(articleId, { visibility: "withdrawn", reason: "hold", version: 0 }, "editor");
  assert.equal((await state(articleId)).visibility, "withdrawn");
  await setVisibility(articleId, { visibility: "public", reason: "reopen request", version: 1 }, "editor");
  assert.deepEqual([(await state(articleId)).visibility, (await state(articleId)).review_status], ["withdrawn", "pending"]);
});

test("manual analysis and regroup retries revoke the old grant before queueing work", async () => {
  const analysis = await approvedFixture();
  await rerun(analysis.articleId, "analyze", `retry-${tag()}`, "editor");
  assert.deepEqual([(await state(analysis.articleId)).visibility, (await state(analysis.articleId)).review_status], ["withdrawn", "pending"]);

  const grouping = await approvedFixture();
  await rerun(grouping.articleId, "group", `regroup-${tag()}`, "editor");
  assert.deepEqual([(await state(grouping.articleId)).visibility, (await state(grouping.articleId)).review_status], ["withdrawn", "pending"]);
});

test("exhausted body extraction closes an approved pending-body item atomically", async () => {
  const { articleId } = await upsertMaterial({
    sourceId, url: `https://example.com/pending-body-${runTag}-${++serial}`, title: "Pending body release",
    bodyText: "Original excerpt", bodyStatus: "pending", via: "fetch",
  });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
    VALUES (${articleId}, 1, 'rule', 'pass', 'industry', '待正文发布', '有证据的摘要', 80, true)`;
  await sql`UPDATE articles SET processing_state = 'analyzed', processing_attempts = 3 WHERE id = ${articleId}`;
  const proposal = await proposeReview(articleId);
  assert.ok(proposal);
  await decideArticleReview(articleId, { status: "approved", curated: true, fingerprint: proposal.fingerprint, version: 1, reason: "checked" }, "editor");
  await markBodyUnconfirmed(articleId, true);
  const [article] = await sql<{ body_status: string; processing_attempts: number }[]>`
    SELECT body_status, processing_attempts FROM articles WHERE id = ${articleId}`;
  assert.deepEqual([article?.body_status, article?.processing_attempts], ["unconfirmed", 0]);
  assert.deepEqual([(await state(articleId)).visibility, (await state(articleId)).review_status], ["withdrawn", "pending"]);
  assert.equal((await app.inject({ method: "GET", url: `/api/site/items/${articleId}` })).statusCode, 404);
});

test("MP retry bookkeeping does not change the approved content fingerprint", async () => {
  const { articleId, proposal } = await approvedFixture({ dajiala: { position: 1, bodyRetry: { attempts: 1, error: "temporary" } } });
  await sql`UPDATE articles SET raw = jsonb_set(raw, '{dajiala,bodyRetry}', ${sql.json({ attempts: 2, error: "temporary" })})
    WHERE id = ${articleId}`;
  assert.equal((await getReviewProposal(articleId))?.fingerprint, proposal.fingerprint);
  await sql`UPDATE articles SET raw = raw #- '{dajiala,bodyRetry}' WHERE id = ${articleId}`;
  assert.equal((await getReviewProposal(articleId))?.fingerprint, proposal.fingerprint);
  assert.equal((await state(articleId)).visibility, "public");
});
