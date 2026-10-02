import "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { proposeReview, setSourceAutoPublic } from "@aihot/backend/editorial/review";
import { decideArticleReview } from "@aihot/backend/editorial/decision";
import { updateSource } from "@aihot/backend/admin/sources";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { buildApp } from "../apps/api/src/app.ts";
import { gate, tag } from "./setup.ts";

const runTag = tag();
const sourceId = `source-mutation-${runTag}`;
let serial = 0;
const app = await buildApp();

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
    VALUES (${sourceId}, 'Original source', 'rss', 'T1', 'editorial', '2100-01-01')`;
});
after(async () => { await app.close(); await stopBoss(); await closeDb(); });

async function approvedFixture() {
  const { articleId } = await upsertMaterial({
    sourceId, url: `https://example.com/source-change-${runTag}-${++serial}`, title: `Release ${serial}`,
    bodyText: `Body ${serial}`, bodyStatus: "ok", via: "fetch",
  });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
    VALUES (${articleId}, 1, 'rule', 'pass', 'industry', '发布测试', '有证据的摘要', 80, true)`;
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${articleId}`;
  const proposal = await proposeReview(articleId);
  assert.ok(proposal);
  await decideArticleReview(articleId, { status: "approved", curated: true, fingerprint: proposal.fingerprint, version: 1, reason: "checked" }, "editor");
  assert.equal((await app.inject({ method: "GET", url: `/api/site/items/${articleId}` })).statusCode, 200);
  return articleId;
}

async function assertRevoked(articleId: string) {
  const [row] = await sql<{ visibility: string; selected: boolean; status: string }[]>`
    SELECT p.visibility, p.selected, r.status FROM publications p JOIN editorial_reviews r ON r.article_id = p.article_id
    WHERE p.article_id = ${articleId}`;
  assert.deepEqual([row?.visibility, row?.selected, row?.status], ["withdrawn", false, "pending"]);
  const [ledger] = await sql<{ op: string }[]>`SELECT op FROM selected_ledger WHERE article_id = ${articleId} ORDER BY seq DESC LIMIT 1`;
  assert.equal(ledger?.op, "remove");
  assert.equal((await app.inject({ method: "GET", url: `/api/site/items/${articleId}` })).statusCode, 404);
}

test("source attribution and tag changes revoke old grants before updateSource returns", async () => {
  const articleId = await approvedFixture();
  const [source] = await sql<{ updated_at: Date }[]>`SELECT updated_at FROM sources WHERE id = ${sourceId}`;
  await updateSource(sourceId, { patch: { name: "Renamed source", tags: ["research"] }, version: source!.updated_at.toISOString(), reason: "source correction" }, "editor");
  await assertRevoked(articleId);
});

test("source auto-public policy version changes revoke existing human grants", async () => {
  const articleId = await approvedFixture();
  await setSourceAutoPublic(sourceId, { enabled: true, version: 0, reason: "policy test" }, "editor");
  await assertRevoked(articleId);
});

test("source edit waits for article before taking source lock and cannot race an old approval back to public", async () => {
  const articleId = await approvedFixture();
  const [source] = await sql<{ updated_at: Date }[]>`SELECT updated_at FROM sources WHERE id = ${sourceId}`;
  const proposal = await proposeReview(articleId);
  assert.ok(proposal);
  const [review] = await sql<{ version: number }[]>`SELECT version FROM editorial_reviews WHERE article_id = ${articleId}`;
  const locked = gate();
  const release = gate();
  const blocker = sql.begin(async (tx) => {
    await tx`SELECT id FROM articles WHERE id = ${articleId} FOR UPDATE`;
    locked.open();
    await release.promise;
  });
  await locked.promise;
  const edit = updateSource(sourceId, { patch: { name: "Concurrent correction" }, version: source!.updated_at.toISOString(), reason: "concurrency" }, "editor");
  const reapprove = decideArticleReview(articleId, {
    status: "approved", curated: true, fingerprint: proposal.fingerprint, version: review!.version, reason: "concurrent review",
  }, "editor").catch((error: Error) => error);
  try {
    await new Promise((resolve) => setTimeout(resolve, 80));
    await sql.begin(async (tx) => {
      await tx`SET LOCAL lock_timeout = '400ms'`;
      await tx`SELECT id FROM sources WHERE id = ${sourceId} FOR SHARE`;
    });
  } finally {
    release.open();
  }
  await Promise.race([Promise.all([blocker, edit, reapprove]), new Promise((_, reject) => setTimeout(() => reject(new Error("concurrent source edit timed out")), 5000))]);
  await assertRevoked(articleId);
});
