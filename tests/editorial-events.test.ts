import "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { proposeReview } from "@aihot/backend/editorial/review";
import { decideArticleReview } from "@aihot/backend/editorial/decision";
import { groupArticle } from "@aihot/backend/events/group";
import { detachFromFact } from "@aihot/backend/admin/content";
import { loadStoryDetail } from "@aihot/backend/publication/stories";
import { loadDevelopments, loadGroupReports } from "@aihot/backend/publication/groups";
import { computeHotRanking } from "@aihot/backend/events/hot";
import { latestHotRanking } from "@aihot/backend/events/hot-read";
import { publishArticle } from "@aihot/backend/publication/publish";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { stub, tag } from "./setup.ts";

const suffix = tag();
const sourceId = `event-review-${suffix}`;
let serial = 0;
const provider = await stub(async (_hit, req) => {
  const content = JSON.parse(req.body).messages[1].content as string;
  const ids = [...content.matchAll(/【候选 (C\d+)】/g)].map((m) => m[1]!);
  return { id: "stub", choices: [{ message: { content: JSON.stringify({
    query: "独立事实", decisions: ids.map((id) => ({ id, relation: "UNRELATED", confidence: 0.99, note: "different" })),
  }) } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
});
process.env.DEEPSEEK_BASE_URL = `${provider.url}/v1`;
process.env.DEEPSEEK_API_KEY = "test-key";

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
    VALUES (${sourceId}, 'Event review fixture', 'rss', 'T1', 'editorial', '2100-01-01')`;
});
after(async () => { await provider.close(); await stopBoss(); await closeDb(); });

async function article(label: string) {
  const n = ++serial;
  const { articleId } = await upsertMaterial({
    sourceId, url: `https://example.com/event-review-${suffix}-${n}`, title: `Release ${label} ${suffix}`,
    bodyText: `Distinct factual material ${label} ${suffix}`, bodyStatus: "ok", via: "fetch", publishedAt: new Date(),
  });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
    VALUES (${articleId}, 1, 'rule', 'pass', 'industry', ${`已审标题 ${label}`}, ${`已审摘要 ${label}`}, 80, true)`;
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${articleId}`;
  const proposal = await proposeReview(articleId);
  assert.ok(proposal);
  return { articleId, proposal };
}

async function grant(articleId: string, fingerprint: string, curated: boolean) {
  const [row] = await sql<{ version: number }[]>`SELECT version FROM editorial_reviews WHERE article_id = ${articleId}`;
  await decideArticleReview(articleId, { status: "approved", curated, fingerprint, version: row!.version, reason: "source checked" }, "editor");
}

async function state(articleId: string) {
  const [row] = await sql<{ visibility: string; selected: boolean; story_id: number | null; fact_id: number | null; review_status: string; curation_status: string | null }[]>`
    SELECT p.visibility, p.selected, p.story_id, p.fact_id, r.status AS review_status, c.status AS curation_status
    FROM publications p JOIN editorial_reviews r ON r.article_id = p.article_id
    LEFT JOIN editorial_curations c ON c.article_id = p.article_id WHERE p.article_id = ${articleId}`;
  assert.ok(row);
  return row;
}

test("asynchronous grouping preserves approved all-feed text but requires a new curation for its story link", async () => {
  const { articleId, proposal } = await article("group-later");
  await grant(articleId, proposal.fingerprint, true);
  assert.deepEqual([(await state(articleId)).visibility, (await state(articleId)).selected], ["public", true]);

  const grouped = await groupArticle(articleId);
  assert.ok(grouped.storyId);
  const after = await state(articleId);
  assert.deepEqual([after.visibility, after.review_status, after.selected, after.curation_status],
    ["public", "approved", false, "pending"]);
  assert.equal(after.story_id, grouped.storyId, "internal membership stays available for a later curation");
  assert.equal(await loadStoryDetail(grouped.storyId!), null, "the unreviewed story link is not public");
});

test("manual detach atomically removes a curated story link while leaving approved all-feed text", async () => {
  const { articleId, proposal } = await article("detach");
  const grouped = await groupArticle(articleId);
  assert.ok(grouped.storyId);
  const current = await proposeReview(articleId);
  assert.ok(current);
  await grant(articleId, current.fingerprint, true);
  assert.equal((await state(articleId)).selected, true);

  await detachFromFact(articleId, "wrong event", "editor");
  const after = await state(articleId);
  assert.deepEqual([after.visibility, after.review_status, after.selected, after.curation_status, after.story_id, after.fact_id],
    ["public", "approved", false, "pending", null, null]);
  assert.equal(await loadStoryDetail(grouped.storyId!), null);
});

test("pending and auto-public evidence cannot create a public story or hot entry", async () => {
  const pending = await article("pending-only");
  const grouped = await groupArticle(pending.articleId);
  assert.ok(grouped.storyId);
  assert.equal(await loadStoryDetail(grouped.storyId!), null);

  const automatic = await article("automatic-only");
  // The auto-policy implementation supplies this exact status. Keep this fixture narrow: no real
  // source is allowlisted and no provider is called in tests.
  await sql`UPDATE editorial_reviews SET status = 'auto_public', reviewed_by = 'policy-test', reviewed_at = now()
    WHERE article_id = ${automatic.articleId}`;
  await publishArticle(automatic.articleId);
  const autoGroup = await groupArticle(automatic.articleId);
  assert.ok(autoGroup.storyId);
  assert.deepEqual([(await state(automatic.articleId)).visibility, (await state(automatic.articleId)).selected], ["public", false]);
  assert.equal(await loadStoryDetail(autoGroup.storyId!), null);

  const rank = await computeHotRanking();
  const latest = await latestHotRanking();
  assert.equal(rank.entries, 0);
  assert.deepEqual(latest?.entries ?? [], []);
});

test("a public story derives text and counts only from curated reports, even if stored event text came from pending evidence", async () => {
  const reviewed = await article("reviewed-story");
  const grouped = await groupArticle(reviewed.articleId);
  assert.ok(grouped.storyId && grouped.factId);
  await grant(reviewed.articleId, (await proposeReview(reviewed.articleId))!.fingerprint, true);
  const pending = await article("secret-pending");
  await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${grouped.factId}, ${pending.articleId}, 'report')`;
  await sql`INSERT INTO story_signals (story_id, article_id, participant_key, source_id, kind, observed_at)
    VALUES (${grouped.storyId}, ${pending.articleId}, ${`pending:${suffix}`}, ${sourceId}, 'editorial', now())`;
  await sql`UPDATE stories SET title = 'PENDING STORY TITLE', summary = 'PENDING STORY SUMMARY',
    digest = 'PENDING STORY DIGEST', latest = 'PENDING STORY LATEST' WHERE id = ${grouped.storyId}`;
  await sql`UPDATE facts SET title = 'PENDING FACT TITLE' WHERE id = ${grouped.factId}`;

  const detail = await loadStoryDetail(grouped.storyId);
  assert.ok(detail);
  assert.equal(detail.title, "已审标题 reviewed-story");
  assert.equal(detail.reportCount, 1);
  assert.equal(detail.timeline.length, 1);
  assert.equal(detail.timeline[0]!.id, reviewed.articleId);
  assert.equal(detail.developments[0]!.title, "已审标题 reviewed-story");
  assert.equal(detail.whyHot.participants48h, 1);
  assert.ok(!JSON.stringify(detail).includes("PENDING STORY") && !JSON.stringify(detail).includes("PENDING FACT"));
  assert.ok(!JSON.stringify(detail).includes(pending.articleId));

  const [ids] = await sql<{ story: string; fact: string }[]>`
    SELECT st.public_id::text AS story, f.public_id AS fact FROM facts f JOIN stories st ON st.id = f.story_id
    WHERE f.id = ${grouped.factId}`;
  const common = { channel: "all" as const, category: null, tag: null, topicTags: null, cursor: null, take: 10, revision: null };
  const developments = await loadDevelopments({ ...common, storyPublicId: ids!.story });
  assert.equal(developments.kind, "ok");
  if (developments.kind === "ok") {
    assert.equal(developments.body.story.title, "已审标题 reviewed-story");
    assert.equal(developments.body.developments[0]!.title, "已审标题 reviewed-story");
    assert.equal(developments.body.developments[0]!.reportCount, 1);
  }
  const reports = await loadGroupReports({ ...common, factPublicId: ids!.fact });
  assert.equal(reports.kind, "ok");
  if (reports.kind === "ok") assert.deepEqual(reports.body.reports.map((r) => r.id), [reviewed.articleId]);
});
