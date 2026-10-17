import assert from 'node:assert/strict';
import {sql,closeDb} from '/app/packages/backend/src/db.ts';
import {collectSource} from '/app/packages/backend/src/sources/collect.ts';
import {stopBoss,QUEUES} from '/app/packages/backend/src/jobs/queue.ts';
const ids=["kol-vitalik", "halborn", "sfc", "hkma", "sfc-circulars", "panews-articles-zh", "kol-colin-wu", "fca", "cftc", "trail-of-bits", "eba", "ofac", "blocksec", "kol-haseeb"];const completedAt="2026-10-02T08:14:46.513Z";
try{
 const before=(await sql`SELECT count(*)::int AS n FROM fetch_runs WHERE source_id IN ${sql(ids)}`)[0].n;
 const paused=[];
 for(const id of ids){const r=await collectSource(id);assert.equal(r.status,'skipped');assert.equal(r.error,'paused');paused.push({sourceId:id,status:r.status,reason:r.error});}
 assert.equal((await sql`SELECT count(*)::int AS n FROM fetch_runs WHERE source_id IN ${sql(ids)}`)[0].n,before);
 const retained=await collectSource('ethereum-foundation',{force:true});assert.equal(retained.status,'ok');
 const [counts]=await sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE enabled)::int AS enabled,count(*) FILTER(WHERE NOT enabled AND health='paused')::int AS paused FROM sources`;
 assert.equal(counts.enabled,80);assert.equal(counts.paused,14);
 const [audit]=await sql`SELECT count(DISTINCT subject)::int AS n FROM audit_log WHERE actor='operator:codex-source-pruning' AND action='source.update' AND after->>'enabled'='false'`;
 assert.equal(audit.n,14);
 const [paidAfter]=await sql`SELECT count(*)::int AS n FROM receipt_attempts ra JOIN receipts r ON r.id=ra.receipt_id JOIN articles a ON a.id=substring(r.subject FROM '^article:([^@]+)') WHERE a.source_id IN ${sql(ids)} AND ra.started_at>=${completedAt}::timestamptz`;
 assert.equal(paidAfter.n,0);
 const [pending]=await sql`SELECT count(*)::int AS n FROM pgboss.job WHERE state IN('created','retry','active') AND name IN ${sql([QUEUES.fetchSource,QUEUES.extractBody,QUEUES.analyze,QUEUES.verifyAutomatic,QUEUES.group,QUEUES.translate])} AND (data->>'sourceId' IN ${sql(ids)} OR data->>'articleId' IN (SELECT id FROM articles WHERE source_id=ANY(${ids}::text[])))`;
 assert.equal(pending.n,0);
 const [stillPublic]=await sql`SELECT count(*)::int AS n FROM publications WHERE source_id IN ${sql(ids)} AND visibility='public'`;
 assert.equal(stillPublic.n,0);
 console.log(JSON.stringify({at:new Date().toISOString(),counts,distinctPauseAudits:audit.n,pausedProbes:paused,pausedSourcesCreatedFetchRuns:0,pausedSourcePaidCallsAfterPruning:paidAfter.n,pausedSourcePendingJobs:pending.n,pausedSourcesPublicProjection:stillPublic.n,retainedSourceProbe:retained,modelSwitch:process.env.MODEL_CALLS_ENABLED,collectSwitch:process.env.COLLECT_ENABLED}));
}finally{await stopBoss();await closeDb();}
