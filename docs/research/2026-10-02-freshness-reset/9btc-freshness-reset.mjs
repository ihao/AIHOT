import assert from 'node:assert/strict';
import {sql,closeDb} from '/app/packages/backend/src/db.ts';
import {resetBudgetUsage,listBudgets} from '/app/packages/backend/src/admin/settings.ts';
import {skipExpiredProcessing} from '/app/packages/backend/src/content/freshness.ts';
import {queueProcessing} from '/app/packages/backend/src/jobs/content.ts';
import {stopBoss} from '/app/packages/backend/src/jobs/queue.ts';
try {
 const [before]=await sql`SELECT count(*)::int AS n FROM receipt_attempts WHERE service='dashscope'`;
 const reset=await resetBudgetUsage('dashscope','站长授权：2026-10-02 一次性重置滚动额度，保留全部付费回执；只处理48小时内有可靠源日期的信息','operator:codex','9btc-dashscope-reset-20261002-once');
 assert.equal(reset.per_minute,20);assert.equal(reset.per_hour,300);assert.equal(reset.per_day,2000);
 const rows=await sql`SELECT id FROM articles WHERE processing_state='new' ORDER BY discovered_at`;
 const skipped=[], queued=[];
 for(const {id} of rows) {
  if(await skipExpiredProcessing(id)){skipped.push(id);continue;}
  await sql`UPDATE articles SET processing_retry_at=NULL,processing_queued_at=NULL WHERE id=${id}`;
  await queueProcessing(id);queued.push(id);
 }
 await sql`UPDATE automatic_verifications SET retry_at=NULL WHERE status='waiting' AND reasons::text LIKE '%Budget for dashscope exhausted%'`;
 const [after]=await sql`SELECT count(*)::int AS n FROM receipt_attempts WHERE service='dashscope'`;
 assert.equal(after.n,before.n);
 console.log(JSON.stringify({at:new Date().toISOString(),reset,ledgerBefore:before.n,ledgerAfter:after.n,skipped,queued,budget:(await listBudgets()).find(b=>b.service==='dashscope')}));
}finally{await stopBoss();await closeDb();}
