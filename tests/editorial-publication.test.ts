import "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { getReviewProposal, proposeReview } from "@aihot/backend/editorial/review";
import { decideArticleReview, decideArticleCuration, StaleReview } from "@aihot/backend/editorial/decision";
import { publishArticle } from "@aihot/backend/publication/publish";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { tag } from "./setup.ts";
import { buildApp } from "../apps/api/src/app.ts";

const runTag = tag();
const sourceId = `publication-review-${runTag}`;
let serial = 0;
const app = await buildApp();

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
    VALUES (${sourceId}, 'Review publication fixture', 'rss', 'T1', 'editorial', '2100-01-01')`;
});
after(async () => { await app.close(); await stopBoss(); await closeDb(); });

async function fixture(selected = true) {
  const { articleId } = await upsertMaterial({
    sourceId, url: `https://example.com/editorial-publication-${runTag}-${++serial}`, title: `Release ${serial}`,
    bodyText: `Body ${serial}`, bodyHtml: `<p>Body ${serial}</p>`, bodyStatus: "ok", via: "fetch", publishedAt: new Date(),
  });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
    VALUES (${articleId}, 1, 'rule', 'pass', 'industry', '发布测试', '有证据的摘要', 80, ${selected})`;
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${articleId}`;
  const proposal = await proposeReview(articleId);
  assert.ok(proposal);
  return { articleId, proposal };
}

async function projection(id: string) {
  return (await sql<{ visibility: string; selected: boolean; selected_ready_at: Date | null; indexable: boolean }[]>`
    SELECT visibility, selected, selected_ready_at, indexable FROM publications WHERE article_id = ${id}`)[0];
}

test("fresh and legacy public projections close until an exact approval commits", async () => {
  const { articleId, proposal } = await fixture();
  await sql`INSERT INTO publications (article_id, title, source_id, channel, url, discovered_at, timeline_at, sort_at, visibility)
    SELECT id, title, source_id, 'news', url, discovered_at, timeline_at, timeline_at, 'public' FROM articles WHERE id = ${articleId}`;
  await publishArticle(articleId);
  assert.equal((await projection(articleId))?.visibility, "withdrawn");
  assert.equal((await app.inject({ method: "GET", url: `/api/site/items/${articleId}` })).statusCode, 404);
  await decideArticleReview(articleId, { status: "approved", fingerprint: proposal.fingerprint, version: 1, reason: "source checked" }, "editor");
  assert.deepEqual([(await projection(articleId))?.visibility, (await projection(articleId))?.selected], ["public", false]);
  assert.equal((await app.inject({ method: "GET", url: `/api/site/items/${articleId}` })).statusCode, 200);
});

test("selected requires a separate curation grant and stale tabs cannot revive it", async () => {
  const { articleId, proposal } = await fixture();
  await decideArticleReview(articleId, { status: "approved", fingerprint: proposal.fingerprint, version: 1, reason: "facts checked" }, "editor");
  assert.equal((await projection(articleId))?.selected, false);
  assert.equal((await sql`SELECT count(*)::int AS n FROM selected_ledger WHERE article_id = ${articleId}`)[0]?.n, 0);
  await decideArticleCuration(articleId, { approved: true, fingerprint: proposal.fingerprint, reviewVersion: 2, version: 0, reason: "feature" }, "editor");
  assert.equal((await projection(articleId))?.selected, true);
  assert.equal((await sql`SELECT count(*)::int AS n FROM selected_ledger WHERE article_id = ${articleId}`)[0]?.n, 1);
  await assert.rejects(() => decideArticleReview(articleId, { status: "rejected", fingerprint: proposal.fingerprint, version: 1, reason: "stale tab" }, "editor"), StaleReview);
  assert.equal((await projection(articleId))?.visibility, "public");
});

test("changed material revokes on reprojection; old fingerprint cannot approve again", async () => {
  const { articleId, proposal } = await fixture();
  await decideArticleReview(articleId, { status: "approved", fingerprint: proposal.fingerprint, version: 1, reason: "facts checked" }, "editor");
  await decideArticleCuration(articleId, { approved: true, fingerprint: proposal.fingerprint, reviewVersion: 2, version: 0, reason: "feature" }, "editor");
  assert.ok((await projection(articleId))?.selected_ready_at);
  await sql`UPDATE articles SET body_text = 'Materially changed body' WHERE id = ${articleId}`;
  assert.notEqual((await getReviewProposal(articleId))?.fingerprint, proposal.fingerprint);
  await publishArticle(articleId);
  assert.deepEqual([(await projection(articleId))?.visibility, (await projection(articleId))?.selected_ready_at], ["withdrawn", null]);
  await assert.rejects(() => decideArticleReview(articleId, { status: "approved", fingerprint: proposal.fingerprint, version: 2, reason: "stale" }, "editor"), StaleReview);
  assert.equal((await projection(articleId))?.visibility, "withdrawn");
});

test("approve selected and reject both update projection and ledger atomically; reapproval gets a new release", async () => {
  const { articleId, proposal } = await fixture();
  await decideArticleReview(articleId, { status: "approved", curated: true, fingerprint: proposal.fingerprint, version: 1, reason: "source and selection checked" }, "editor");
  const firstReady = (await projection(articleId))?.selected_ready_at;
  assert.equal((await projection(articleId))?.selected, true);
  await decideArticleReview(articleId, { status: "rejected", fingerprint: proposal.fingerprint, version: 2, reason: "withdraw" }, "editor");
  assert.deepEqual([(await projection(articleId))?.visibility, (await projection(articleId))?.selected_ready_at], ["withdrawn", null]);
  const [removed] = await sql<{ op: string }[]>`SELECT op FROM selected_ledger WHERE article_id = ${articleId} ORDER BY seq DESC LIMIT 1`;
  assert.equal(removed?.op, "remove");
  await decideArticleReview(articleId, { status: "approved", curated: true, fingerprint: proposal.fingerprint, version: 3, reason: "rechecked" }, "editor");
  assert.equal((await projection(articleId))?.selected, true);
  assert.notEqual((await projection(articleId))?.selected_ready_at?.getTime(), firstReady?.getTime());
});

test("auto-public projection is all-only, even if model selects it", async () => {
  const { articleId, proposal } = await fixture();
  await sql`UPDATE editorial_reviews SET status = 'auto_public', reviewed_by = 'policy', reviewed_at = now()
    WHERE article_id = ${articleId}`;
  await publishArticle(articleId);
  assert.deepEqual([(await projection(articleId))?.visibility, (await projection(articleId))?.selected], ["public", false]);
  assert.equal((await projection(articleId))?.indexable, false);
  assert.equal((await sql`SELECT count(*)::int AS n FROM selected_ledger WHERE article_id = ${articleId}`)[0]?.n, 0);
  assert.ok(proposal.fingerprint);
});
