import "./setup.ts";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
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
