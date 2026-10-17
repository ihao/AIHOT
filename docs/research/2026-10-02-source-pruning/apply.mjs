import assert from 'node:assert/strict';
import {sql,closeDb} from '/app/packages/backend/src/db.ts';
import {updateSource} from '/app/packages/backend/src/admin/sources.ts';
import {getBoss,stopBoss,QUEUES} from '/app/packages/backend/src/jobs/queue.ts';
import {selectedCondition} from '/app/packages/backend/src/publication/items.ts';
const ids=["kol-vitalik", "halborn", "sfc", "hkma", "sfc-circulars", "panews-articles-zh", "kol-colin-wu", "fca", "cftc", "trail-of-bits", "eba", "ofac", "blocksec", "kol-haseeb"];
const scores={"kol-vitalik": 47.5, "halborn": 54.38, "sfc": 55.85, "hkma": 56.38, "sfc-circulars": 57.53, "panews-articles-zh": 58.23, "kol-colin-wu": 59.24, "fca": 59.39, "cftc": 59.67, "trail-of-bits": 60.02, "eba": 60.65, "ofac": 60.7, "blocksec": 60.91, "kol-haseeb": 60.94};
const reason='站长授权2026-10-02：94个信源按实际接入质量30%、价值35%、稳定性25%、调用效率10%评分，关停最低14个，保留80个启用；保留配置、内容与回执档案。';
try{
 const sources=await sql`SELECT id,name,enabled,health,updated_at FROM sources ORDER BY id`;
 assert.equal(sources.length,94);
 assert.equal(new Set(ids).size,14);
 assert.ok(sources.filter(s=>!ids.includes(s.id)).every(s=>s.enabled));
 const articleIds=(await sql`SELECT id FROM articles WHERE source_id IN ${sql(ids)}`).map(a=>a.id);
 const [selectedBefore]=await sql`SELECT count(*)::int AS n FROM publications p JOIN sources s ON s.id=p.source_id WHERE ${selectedCondition(new Date())}`;
 const changes=[];
 for(const id of ids){
  const [source]=await sql`SELECT id,name,enabled,updated_at FROM sources WHERE id=${id}`;
  assert.ok(source);
  if(!source.enabled){changes.push({id,name:source.name,score:scores[id],alreadyPaused:true});continue;}
  await updateSource(id,{patch:{enabled:false},version:new Date(source.updated_at).toISOString(),reason:`${reason} 总分${scores[id]}/100。`},'operator:codex-source-pruning');
  changes.push({id,name:source.name,score:scores[id],enabled:false});
 }
 const boss=await getBoss();
 const jobs=await sql`SELECT id,name FROM pgboss.job WHERE state IN('created','retry','active') AND name IN ${sql([QUEUES.fetchSource,QUEUES.extractBody,QUEUES.analyze,QUEUES.verifyAutomatic,QUEUES.group,QUEUES.translate])}
   AND (data->>'sourceId' IN ${sql(ids)} OR data->>'articleId' IN ${sql(articleIds)})`;
 const cancelled=[];
 for(const name of new Set(jobs.map(j=>j.name))){
  const jobIds=jobs.filter(j=>j.name===name).map(j=>j.id);
  await boss.cancel(name,jobIds);cancelled.push({queue:name,count:jobIds.length});
 }
 const settled=await sql`UPDATE articles SET processing_state='skipped',processing_error='source-pruned: 2026-10-02',processing_retry_at=NULL,processing_queued_at=NULL
   WHERE source_id IN ${sql(ids)} AND processing_state IN('new','failed') RETURNING id`;
 const stale=await sql`UPDATE automatic_verifications SET status='stale',reasons='["source_disabled:2026-10-02"]',lease_token=NULL,lease_until=NULL,retry_at=NULL,updated_at=now()
   WHERE article_id IN ${sql(articleIds)} AND status IN('queued','waiting','running') RETURNING id`;
 await sql`DELETE FROM event_group_waits WHERE article_id IN ${sql(articleIds)}`;
 await sql`INSERT INTO audit_log(actor,action,subject,reason,after) VALUES('operator:codex-source-pruning','sources.prune-jobs','sources:pruning-20261002',${reason},${sql.json({ids,cancelled,settled:settled.length,stale:stale.length})})`;
 const after=await sql`SELECT id,name,enabled,health FROM sources ORDER BY id`;
 assert.equal(after.filter(s=>s.enabled).length,80);
 assert.ok(after.filter(s=>ids.includes(s.id)).every(s=>!s.enabled&&s.health==='paused'));
 const [queuedLeft]=await sql`SELECT count(*)::int AS n FROM pgboss.job WHERE state IN('created','retry','active') AND name IN ${sql([QUEUES.fetchSource,QUEUES.extractBody,QUEUES.analyze,QUEUES.verifyAutomatic,QUEUES.group,QUEUES.translate])} AND (data->>'sourceId' IN ${sql(ids)} OR data->>'articleId' IN ${sql(articleIds)})`;
 assert.equal(queuedLeft.n,0);
 const [selectedAfter]=await sql`SELECT count(*)::int AS n FROM publications p JOIN sources s ON s.id=p.source_id WHERE ${selectedCondition(new Date())}`;
 console.log(JSON.stringify({at:new Date().toISOString(),reason,before:{total:sources.length,enabled:sources.filter(s=>s.enabled).length,selected:selectedBefore.n},changes,cancelled,settled:settled.length,verificationStale:stale.length,after:{total:after.length,enabled:after.filter(s=>s.enabled).length,paused:after.filter(s=>!s.enabled).length,selected:selectedAfter.n,pendingPausedSourceJobs:queuedLeft.n},enabledIds:after.filter(s=>s.enabled).map(s=>s.id)}));
}finally{await stopBoss();await closeDb();}
