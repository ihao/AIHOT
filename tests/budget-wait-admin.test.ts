import "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { tag } from "./setup.ts";
process.env.DEV_AUTH_ROLE = "admin";
const { closeDb, sql } = await import("@aihot/backend/db");
const { stopBoss } = await import("@aihot/backend/jobs/queue");
const { buildApp } = await import("../apps/api/src/app.ts");
const app = await buildApp();
after(async () => { await app.close(); await stopBoss(); await closeDb(); });

test("budget waits are distinct from failures and reading them preserves retry and publication state", async () => {
  const source = `budget-wait-${tag()}`;
  await sql`INSERT INTO sources (id,name,kind,tier,participation_mode) VALUES (${source},'Budget waiting fixture','rss','T1','editorial')`;
  const cases = [
    ["new", "Budget for dashscope exhausted (day)"],
    ["new", "Budget for dashscope exhausted (minute)"],
    ["new", "Budget for dashscope exhausted (stopped)"],
    ["new", "Budget for model_cost exhausted (amount_day): 北京时间当天费用已满"],
    ["new", "Budget for model_cost exhausted (amount_rolling): 滚动24小时金额已满"],
    ["failed", "Budget for dashscope exhausted (day)"],
    ["new", "extract: timeout"],
  ];
  const ids: string[] = [];
  for (const [state,error] of cases) {
    const id = `bw-${tag()}`;
    ids.push(id);
    await sql`INSERT INTO articles (id,source_id,identity_key,url,title,discovered_at,timeline_at,processing_state,processing_error,processing_retry_at)
      VALUES (${id},${source},${id},${`https://example.com/${id}`},${id},now(),now(),${state!},${error!},now()+interval '1 hour')`;
  }
  const before = await sql`SELECT id,processing_state,processing_error,processing_retry_at FROM articles WHERE source_id=${source} ORDER BY id`;
  const res = await app.inject({method:"GET",url:`/api/admin/review?source=${source}`});
  assert.equal(res.statusCode,200);
  const data=res.json();
  assert.equal(data.budgetWaitCount,5);
  assert.equal(data.failureCount,2);
  assert.deepEqual(new Set(data.budgetWaits.map((r: {id:string})=>r.id)),new Set(ids.slice(0,5)));
  assert.deepEqual(new Set(data.failures.map((r: {id:string})=>r.id)),new Set(ids.slice(5)));
  assert.ok(data.budgetWaits.every((r: {retry_at:string})=>Number.isFinite(Date.parse(r.retry_at))));
  assert.deepEqual(await sql`SELECT id,processing_state,processing_error,processing_retry_at FROM articles WHERE source_id=${source} ORDER BY id`,before);
  assert.equal((await sql`SELECT count(*)::int n FROM publications WHERE source_id=${source}`)[0]!.n,0);
  const other=(await app.inject({method:"GET",url:`/api/admin/review?source=absent-${source}`})).json();
  assert.equal(other.budgetWaitCount,0);
  assert.equal(other.budgetWaits.length,0);
});
