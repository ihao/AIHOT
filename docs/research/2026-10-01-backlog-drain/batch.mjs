import { sql, closeDb } from '/app/packages/backend/src/db.ts';
import { updateBudget } from '/app/packages/backend/src/admin/settings.ts';
import { audit } from '/app/packages/backend/src/admin/auth.ts';
import { queueProcessing } from '/app/packages/backend/src/jobs/content.ts';
import { stopBoss } from '/app/packages/backend/src/jobs/queue.ts';
import { AUTOMATIC_RULE_VERSION } from '/app/packages/backend/src/editorial/automatic-verification.ts';
import { readFile } from 'node:fs/promises';
const mode=process.argv[2];
const actor='operator:codex-authorized-backlog-2026-10-01';
try {
 if(mode==='snapshot') {
  const [budget]=await sql`SELECT * FROM budgets WHERE service='dashscope'`;
  const articles=await sql`SELECT id FROM articles ORDER BY id`;
  const counts=await sql`SELECT processing_state,count(*)::int AS count FROM articles GROUP BY 1`;
  console.log(JSON.stringify({budget,ids:articles.map(a=>a.id),initialCounts:counts,sealedAt:new Date().toISOString(),deadline:new Date(Date.now()+12*3600000).toISOString()}));
 } else {
  const state=JSON.parse(await readFile('/tmp/ninebtc-backlog-state.json','utf8'));
  if(mode==='relax') {
   await updateBudget('dashscope',{perMinute:1000,perHour:60000,perDay:1000000,reason:'站长授权临时放宽限额，处理已封存积压；服务器批次守护完成或超时自动恢复原额度；保留回执和全部审核门禁。'},actor);
   const resumed=await sql`UPDATE articles SET processing_retry_at=now(),processing_queued_at=NULL WHERE id IN ${sql(state.ids)} AND processing_state='new' AND processing_error LIKE 'Budget for dashscope exhausted (%)' RETURNING id`;
   await audit(actor,'processing.backlog_start','provider:dashscope','站长授权处理全部已封存积压并自动恢复额度',state.initialCounts,{snapshot:state.ids.length,budgetWaiting:resumed.length});
   for(const r of resumed.slice(0,500)) await queueProcessing(r.id);
   console.log(JSON.stringify({relaxed:true,snapshot:state.ids.length,resumed:resumed.length}));
  } else if(mode==='restore') {
   const b=state.budget;
   const budget=await updateBudget('dashscope',{perMinute:b.per_minute,perHour:b.per_hour,perDay:b.per_day,reason:'封存积压批次结束或保护截止；恢复批次前配额，付费回执保留，滚动窗口不清零。'},actor);
   console.log(JSON.stringify({restored:true,budget}));
  } else if(mode==='status') {
   const counts=await sql`SELECT processing_state,count(*)::int AS count FROM articles WHERE id IN ${sql(state.ids)} GROUP BY 1`;
   const [verifications]=await sql`SELECT count(*)::int AS waiting FROM automatic_verifications v JOIN articles a ON a.id=v.article_id WHERE a.id IN ${sql(state.ids)} AND v.article_revision=a.revision AND v.automatic_rule_version=${AUTOMATIC_RULE_VERSION} AND v.status IN ('queued','running','waiting')`;
   const [jobs]=await sql`SELECT count(*)::int AS pending FROM pgboss.job WHERE name IN ('content.analyze','content.extract-body','content.verify-automatic','events.group','events.digest') AND state IN ('created','active','retry')`;
   const failedGroups=await sql`SELECT DISTINCT ON (data->>'articleId') data->>'articleId' AS article_id,state,output,created_on FROM pgboss.job WHERE name='events.group' AND data->>'articleId' IN ${sql(state.ids)} ORDER BY data->>'articleId',created_on DESC`;
   const [table]=await sql`SELECT to_regclass('public.event_group_waits') AS present`;
   const waits=table.present ? (await sql`SELECT count(*)::int AS waiting FROM event_group_waits WHERE article_id IN ${sql(state.ids)}`)[0].waiting : 0;
   const [calls]=await sql`SELECT count(*)::int AS requests FROM receipt_attempts WHERE service='dashscope' AND origin='live' AND started_at>=${state.sealedAt}`;
   let validation;
   if(counts.every(c=>!['new','failed'].includes(c.processing_state)) && verifications.waiting===0 && jobs.pending===0 && waits===0 && !failedGroups.some(j=>j.state==='failed')) {
    const {computeHotRanking}=await import('/app/packages/backend/src/events/hot.ts');
    const {publishAutomaticDaily}=await import('/app/packages/backend/src/reports/automatic.ts');
    validation={hot:await computeHotRanking(),daily:await publishAutomaticDaily()};
   }
   console.log(JSON.stringify({validation,at:new Date().toISOString(),counts,verificationWaiting:verifications.waiting,pendingJobs:jobs.pending,groupWaiting:waits,failedGroups:failedGroups.filter(j=>j.state==='failed'),requests:calls.requests}));
  }
 }
} finally {await stopBoss();await closeDb();}
