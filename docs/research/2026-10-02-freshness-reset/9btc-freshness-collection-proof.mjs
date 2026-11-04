import assert from 'node:assert/strict';
import {sql,closeDb} from '/app/packages/backend/src/db.ts';
import {collectSource} from '/app/packages/backend/src/sources/collect.ts';
import {stopBoss} from '/app/packages/backend/src/jobs/queue.ts';
try {
 const stale='uqkhu8ja26k0rh1u4iydvts84';
 const [before]=await sql`SELECT revision FROM articles WHERE id=${stale}`;
 const results=[];
 for(const id of ['ethereum-magicians','fca','sec-press-releases']) {
  const result=await collectSource(id,{force:true});
  const [run]=await sql`SELECT status,found_count,new_count,detail FROM fetch_runs WHERE source_id=${id} ORDER BY id DESC LIMIT 1`;
  results.push({result,run});
 }
 const [after]=await sql`SELECT revision,processing_state,processing_error FROM articles WHERE id=${stale}`;
 assert.equal(after.revision,before.revision);
 const freshSince=await sql`SELECT count(*)::int AS n FROM articles WHERE created_at>(SELECT usage_reset_at FROM budgets WHERE service='dashscope') AND (published_at IS NULL OR published_at<created_at-interval '48 hours')`;
 assert.equal(freshSince[0].n,0);
 console.log(JSON.stringify({at:new Date().toISOString(),results,expiredArticle:{before,after},newExpiredOrUndated:freshSince[0].n}));
}finally{await stopBoss();await closeDb();}
