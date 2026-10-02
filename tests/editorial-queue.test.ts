import "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { tag } from "./setup.ts";

process.env.DEV_AUTH_ROLE = "admin";
const { closeDb, sql } = await import("@aihot/backend/db");
const { upsertMaterial } = await import("@aihot/backend/content/materials");
const { publishArticle } = await import("@aihot/backend/publication/publish");
const { stopBoss } = await import("@aihot/backend/jobs/queue");
const { config } = await import("@aihot/backend/config");
const { buildApp } = await import("../apps/api/src/app.ts");
const app = await buildApp();
const T = tag();
const source = `queue-${T}`;
let serial = 0;

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
    VALUES (${source}, 'Queue fixture', 'rss', 'T1', 'editorial', '2100-01-01')`;
});
after(async () => { await app.close(); await stopBoss(); await closeDb(); });

async function item(title: string, category = "industry") {
  const n = ++serial;
  const { articleId } = await upsertMaterial({
    sourceId: source, url: `https://example.com/queue-${T}-${n}`, title,
    bodyText: `${title} original evidence`, bodyStatus: "ok", via: "fetch", publishedAt: new Date(),
  });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, reason_zh, score, selected)
    VALUES (${articleId}, 1, 'rule', 'pass', ${category}, ${`中文 ${title}`}, ${`摘要 ${title}`}, '证据充分', 75, true)`;
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${articleId}`;
  await publishArticle(articleId);
  return articleId;
}

test("daily report management exposes the configured mode and Shanghai schedule without changing report state", async () => {
  const oldMode = config.editorialMode;
  const oldTime = config.automaticDailyTime;
  try {
    for (const mode of ["automatic", "manual"] as const) {
      config.editorialMode = mode;
      config.automaticDailyTime = "20:45";
      const before = await sql`SELECT count(*)::int AS n FROM report_drafts`;
      const response = await app.inject({ method: "GET", url: "/api/admin/reports/daily" });
      assert.equal(response.statusCode, 200);
      const state = response.json();
      assert.equal(state.editorialMode, mode);
      assert.equal(state.automaticDailyTime, "20:45");
      assert.match(state.today, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok("draft" in state);
      assert.deepEqual(await sql`SELECT count(*)::int AS n FROM report_drafts`, before, "reading management state must not generate a draft");
    }
  } finally {
    config.editorialMode = oldMode;
    config.automaticDailyTime = oldTime;
  }
});

test("daily RSS exposes automatic configured time and preserves manual-mode wording", async () => {
  const oldMode = config.editorialMode;
  const oldTime = config.automaticDailyTime;
  try {
    config.editorialMode = "automatic";
    config.automaticDailyTime = "20:45";
    const automatic = await app.inject({ method: "GET", url: "/feed/daily.xml" });
    assert.equal(automatic.statusCode, 200);
    assert.match(automatic.body, /20:45/);
    assert.match(automatic.body, /自动/);
    config.editorialMode = "manual";
    const manual = await app.inject({ method: "GET", url: "/feed/daily.xml" });
    assert.equal(manual.statusCode, 200);
    assert.match(manual.body, /手动模式/);
    assert.doesNotMatch(manual.body, /20:45/);
  } finally {
    config.editorialMode = oldMode;
    config.automaticDailyTime = oldTime;
  }
});

test("nightly queue shows prioritized evidence and keeps failures separate", async () => {
  const routine = await item("Routine release");
  const risk = await item("Protocol exploit and stolen funds");
  const [failed] = await sql<{ id: string }[]>`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at, processing_state, processing_error)
    VALUES (${`failure-${T}`}, ${source}, ${`failure-${T}`}, 'https://example.com/failure', 'Failed collection', now(), now(), 'failed', 'model timeout') RETURNING id`;
  const res = await app.inject({ method: "GET", url: `/api/admin/review?limit=30&source=${source}` });
  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.pendingCount >= 2, true);
  assert.equal(data.failures.some((r: { id: string }) => r.id === failed!.id), true);
  assert.equal(data.rows.some((r: { id: string }) => r.id === failed!.id), false);
  const high = data.rows.find((r: { id: string }) => r.id === risk);
  const low = data.rows.find((r: { id: string }) => r.id === routine);
  assert.ok(high && low);
  assert.ok(data.rows.indexOf(high) < data.rows.indexOf(low));
  assert.match(high.original.body, /original evidence/);
  assert.match(high.chinese.summary, /摘要/);
  assert.match(high.riskReason, /exploit|资金|安全/i);
  assert.match(high.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(typeof high.version, "number");
});

test("queue decision requires CSRF and rejects stale displayed fingerprint", async () => {
  const id = await item("Release candidate");
  const list = (await app.inject({ method: "GET", url: `/api/admin/review?source=${source}` })).json();
  const row = list.rows.find((r: { id: string }) => r.id === id);
  assert.ok(row);
  const body = { status: "approved", curated: false, fingerprint: row.fingerprint, version: row.version, reason: "与原文核对" };
  const forbidden = await app.inject({ method: "POST", url: `/api/admin/content/${id}/review`, payload: body });
  assert.equal(forbidden.statusCode, 403);
  const ok = await app.inject({ method: "POST", url: `/api/admin/content/${id}/review`, headers: { "x-csrf-token": "dev" }, payload: body });
  assert.equal(ok.statusCode, 200);
  const stale = await app.inject({ method: "POST", url: `/api/admin/content/${id}/review`, headers: { "x-csrf-token": "dev" }, payload: body });
  assert.equal(stale.statusCode, 409);
  const [audit] = await sql<{ before: Record<string, unknown>; after: Record<string, unknown> }[]>`
    SELECT before, after FROM audit_log WHERE subject = ${`content:${id}`} AND action = 'content.review' ORDER BY id DESC LIMIT 1`;
  assert.equal(audit!.before.version, row.version);
  assert.equal(audit!.after.fingerprint, row.fingerprint);
});

test("an edit invalidates the displayed decision and the queue shows the corrected copy", async () => {
  const id = await item("Correction candidate");
  const url = `/api/admin/review?source=${source}`;
  const before = (await app.inject({ method: "GET", url })).json().rows.find((r: { id: string }) => r.id === id);
  assert.ok(before);
  const edit = await app.inject({ method: "POST", url: `/api/admin/content/${id}/override`,
    headers: { "x-csrf-token": "dev" },
    payload: { fields: { title: "人工核对标题", summary: "人工核对摘要" }, version: 0, reason: "原文已核对" } });
  assert.equal(edit.statusCode, 200);
  const stale = await app.inject({ method: "POST", url: `/api/admin/content/${id}/review`,
    headers: { "x-csrf-token": "dev" },
    payload: { status: "approved", fingerprint: before.fingerprint, version: before.version, reason: "旧页面" } });
  assert.equal(stale.statusCode, 409);
  const after = (await app.inject({ method: "GET", url })).json().rows.find((r: { id: string }) => r.id === id);
  assert.equal(after.chinese.title, "人工核对标题");
  assert.equal(after.chinese.summary, "人工核对摘要");
  assert.notEqual(after.fingerprint, before.fingerprint);
});

test("queue actions distinguish all-feed approval, curation and rejection", async () => {
  const allId = await item("Ordinary protocol release");
  const selectedId = await item("Research announcement");
  const rejectedId = await item("Unsupported claim");
  const rows = (await app.inject({ method: "GET", url: `/api/admin/review?source=${source}` })).json().rows as Array<{ id: string; fingerprint: string; version: number }>;
  for (const [id, status, curated] of [
    [allId, "approved", false], [selectedId, "approved", true], [rejectedId, "rejected", false],
  ] as const) {
    const row = rows.find((r) => r.id === id);
    assert.ok(row);
    const res = await app.inject({ method: "POST", url: `/api/admin/content/${id}/review`,
      headers: { "x-csrf-token": "dev" },
      payload: { status, curated, fingerprint: row.fingerprint, version: row.version, reason: "逐项核对原文" } });
    assert.equal(res.statusCode, 200);
  }
  const projections = await sql<{ article_id: string; visibility: string; selected: boolean }[]>`
    SELECT article_id, visibility, selected FROM publications WHERE article_id IN (${allId}, ${selectedId}, ${rejectedId})`;
  const byId = new Map(projections.map((r) => [r.article_id, r]));
  assert.deepEqual([byId.get(allId)?.visibility, byId.get(allId)?.selected], ["public", false]);
  assert.deepEqual([byId.get(selectedId)?.visibility, byId.get(selectedId)?.selected], ["public", true]);
  assert.deepEqual([byId.get(rejectedId)?.visibility, byId.get(rejectedId)?.selected], ["withdrawn", false]);
});
