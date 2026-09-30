import "./setup.ts";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { submitFeedback } from "@aihot/backend/operations/feedback";
import { dailyRetention } from "@aihot/backend/operations/retention";
import { tag } from "./setup.ts";

config.dataDir = await mkdtemp(path.join(tmpdir(), "ninebtc-feedback-retention-"));
after(async () => { await closeDb(); await rm(config.dataDir, { recursive: true }); });

test("local feedback screenshots expire after 30 days even when Feishu forwarding is disabled", async () => {
  const oldName = `old-${tag()}.png`;
  const freshName = `fresh-${tag()}.png`;
  const dir = path.join(config.dataDir, "feedback-screenshots");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, oldName), "old screenshot");
  await writeFile(path.join(dir, freshName), "fresh screenshot");
  const oldTime = new Date(Date.now() - 31 * 86400_000);
  await utimes(path.join(dir, oldName), oldTime, oldTime);
  const [old] = await sql<{ id: number }[]>`
    INSERT INTO feedback (content, screenshot_key, source_hash, created_at)
    VALUES ('old test', ${`local:${oldName}`}, ${tag()}, now() - interval '31 days') RETURNING id`;
  const [fresh] = await sql<{ id: number }[]>`
    INSERT INTO feedback (content, screenshot_key, source_hash)
    VALUES ('fresh test', ${`local:${freshName}`}, ${tag()}) RETURNING id`;

  await dailyRetention();

  const [expired] = await sql<{ screenshot_key: string | null }[]>`SELECT screenshot_key FROM feedback WHERE id = ${old!.id}`;
  const [remaining] = await sql<{ screenshot_key: string | null }[]>`SELECT screenshot_key FROM feedback WHERE id = ${fresh!.id}`;
  assert.equal(expired!.screenshot_key, "gone:expired");
  await assert.rejects(() => readFile(path.join(dir, oldName)), { code: "ENOENT" });
  assert.equal(remaining!.screenshot_key, `local:${freshName}`);
  assert.equal((await readFile(path.join(dir, freshName))).toString(), "fresh screenshot");
});

test("an old feedback record cannot delete a screenshot still referenced by a recent submission", async () => {
  const name = `shared-${tag()}.png`;
  const dir = path.join(config.dataDir, "feedback-screenshots");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), "shared screenshot");
  const [old] = await sql<{ id: number }[]>`
    INSERT INTO feedback (content, screenshot_key, source_hash, created_at)
    VALUES ('old shared', ${`local:${name}`}, ${tag()}, now() - interval '31 days') RETURNING id`;
  const [fresh] = await sql<{ id: number }[]>`
    INSERT INTO feedback (content, screenshot_key, source_hash)
    VALUES ('new shared', ${`local:${name}`}, ${tag()}) RETURNING id`;

  await dailyRetention();

  const [oldRow] = await sql<{ screenshot_key: string | null }[]>`SELECT screenshot_key FROM feedback WHERE id = ${old!.id}`;
  const [freshRow] = await sql<{ screenshot_key: string | null }[]>`SELECT screenshot_key FROM feedback WHERE id = ${fresh!.id}`;
  assert.equal(oldRow!.screenshot_key, "gone:expired");
  assert.equal(freshRow!.screenshot_key, `local:${name}`);
  assert.equal((await readFile(path.join(dir, name))).toString(), "shared screenshot");
});

test("failed screenshot deletion leaves the database reference for retry", async () => {
  const name = `blocked-${tag()}`;
  await mkdir(path.join(config.dataDir, "feedback-screenshots", name), { recursive: true });
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO feedback (content, screenshot_key, source_hash, created_at)
    VALUES ('blocked test', ${`local:${name}`}, ${tag()}, now() - interval '31 days') RETURNING id`;
  await assert.rejects(() => dailyRetention(), /EISDIR|EPERM/);
  const [remaining] = await sql<{ screenshot_key: string | null }[]>`SELECT screenshot_key FROM feedback WHERE id = ${row!.id}`;
  assert.equal(remaining!.screenshot_key, `local:${name}`);
});

test("equal screenshot bytes in two new feedback submissions get independent files", async () => {
  process.env.FEISHU_INTERNAL_ENABLED = "false";
  const screenshot = { mime: "image/png", data: Buffer.from("same screenshot") };
  const first = await submitFeedback({ content: "First screenshot", screenshot, ip: "203.0.113.11", userAgent: "test" });
  const second = await submitFeedback({ content: "Second screenshot", screenshot, ip: "203.0.113.12", userAgent: "test" });
  const rows = await sql<{ screenshot_key: string }[]>`
    SELECT screenshot_key FROM feedback WHERE id IN (${first.id}, ${second.id}) ORDER BY id`;
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0]!.screenshot_key, rows[1]!.screenshot_key);
});

test("an unreadable screenshot directory fails retention instead of reporting success", async () => {
  const previous = config.dataDir;
  const root = await mkdtemp(path.join(tmpdir(), "ninebtc-retention-error-"));
  try {
    config.dataDir = root;
    await writeFile(path.join(root, "feedback-screenshots"), "not a directory");
    await assert.rejects(() => dailyRetention(new Date("2020-01-01T00:00:00Z")), /ENOTDIR/);
  } finally {
    config.dataDir = previous;
    await rm(root, { recursive: true });
  }
});
