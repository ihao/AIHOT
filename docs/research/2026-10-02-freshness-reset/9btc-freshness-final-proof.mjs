import assert from 'node:assert/strict';
import {sql,closeDb} from '/app/packages/backend/src/db.ts';
import {config} from '/app/packages/backend/src/config.ts';
import {listBudgets,updateBudget} from '/app/packages/backend/src/admin/settings.ts';
import {selectedCondition} from '/app/packages/backend/src/publication/items.ts';
try{
 assert.equal(config.editorialMode,'automatic');assert.equal((process.env.COLLECT_ENABLED==='true'),true);assert.equal(config.modelCallsEnabled,true);
 await updateBudget('dashscope',{perMinute:20,perHour:300,perDay:2000,reason:'2026-10-02 站长授权一次性重置已完成；此后仍按20/分钟、300/小时、2000/滚动24小时计算，全部付费回执保留。'},'operator:codex');
 const budget=(await listBudgets()).find(b=>b.service==='dashscope');
 const [resetAudit]=await sql`SELECT count(*)::int AS n FROM audit_log WHERE action='budget.reset_usage' AND subject='budget:dashscope' AND request_id='9btc-dashscope-reset-20261002-once'`;
 assert.equal(resetAudit.n,1);
 const [ledger]=await sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE started_at<(SELECT usage_reset_at FROM budgets WHERE service='dashscope'))::int AS before_reset,count(*) FILTER(WHERE started_at>=(SELECT usage_reset_at FROM budgets WHERE service='dashscope'))::int AS after_reset FROM receipt_attempts WHERE service='dashscope'`;
 assert.equal(ledger.before_reset,13064);assert.ok(ledger.after_reset>0);assert.equal(ledger.after_reset,budget.used_day);
 const skippedIds=['dhawqm28we4qez63393j2qr5a','uqkhu8ja26k0rh1u4iydvts84'];
 const skipped=await sql`SELECT id,processing_state,processing_error,revision FROM articles WHERE id IN ${sql(skippedIds)}`;
 for(const a of skipped)assert.equal(a.processing_state,'skipped');
 const [oldCalls]=await sql`SELECT count(*)::int AS n FROM receipt_attempts ra JOIN receipts r ON r.id=ra.receipt_id WHERE ra.started_at>=(SELECT usage_reset_at FROM budgets WHERE service='dashscope') AND EXISTS(SELECT 1 FROM articles a WHERE a.id IN ${sql(skippedIds)} AND r.subject LIKE 'article:'||a.id||'%')`;
 assert.equal(oldCalls.n,0);
 const initialFresh=await sql`SELECT id,processing_state,processing_error,published_at FROM articles WHERE id IN ${sql(['bhs5lhwwt0v91eftfcpw9paml','m6n6hloxyzlzlm04ybxd7r9qz','uyqt75okinobh8xi4f1n89mbi','lab5aciql3uqe2iy2zb3cpj71'])}`;
 const processing=await sql`SELECT processing_state,count(*)::int AS n FROM articles GROUP BY 1`;
 const [newHistorical]=await sql`SELECT count(*)::int AS n FROM articles WHERE created_at>=(SELECT usage_reset_at FROM budgets WHERE service='dashscope') AND (published_at IS NULL OR published_at<created_at-interval '48 hours')`;
 assert.equal(newHistorical.n,0);
 const [selected]=await sql`SELECT count(*)::int AS n FROM publications p JOIN sources s ON s.id=p.source_id WHERE ${selectedCondition(new Date())}`;
 const filtered=await sql`SELECT s.id,s.name,f.status,f.found_count,f.new_count,f.detail->'freshness' freshness FROM fetch_runs f JOIN sources s ON s.id=f.source_id WHERE f.started_at>=(SELECT usage_reset_at FROM budgets WHERE service='dashscope') AND f.detail?'freshness' ORDER BY f.id`;
 console.log(JSON.stringify({at:new Date().toISOString(),runtime:{collect:(process.env.COLLECT_ENABLED==='true'),model:config.modelCallsEnabled,editorial:config.editorialMode},budget,resetAudit:resetAudit.n,ledger,skipped,oldSkippedPaidCalls:oldCalls.n,initialFresh,processing,newHistorical:newHistorical.n,selectedVisible:selected.n,filteredFetches:filtered}));
}finally{await closeDb();}
