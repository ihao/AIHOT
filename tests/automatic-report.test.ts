import { stub, tag } from './setup.ts';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { config } from '../packages/backend/src/config.ts';
import { sql, closeDb } from '../packages/backend/src/db.ts';
import { upsertMaterial } from '../packages/backend/src/content/materials.ts';
import { setSourceAutoPublic } from '../packages/backend/src/editorial/review.ts';
import { AUTOMATIC_RULE_VERSION, verifyAutomaticArticle, queueAutomaticVerificationTx } from '../packages/backend/src/editorial/automatic-verification.ts';
import { loadReport, v1Daily, listReports } from '../packages/backend/src/publication/reports.ts';
import { stopBoss } from '../packages/backend/src/jobs/queue.ts';
import { invalidateModelCache } from '../packages/backend/src/editorial/models.ts';
import { beijingDate } from '@aihot/contracts/time';
const T = tag(), source = `report-auto-${T}`, other = `${source}-other`, body = 'Bitcoin Core released a maintenance client update.';
let serial = 0, verdict = 'supported', pauseDuringPrefilter: string | null = null;
const checks = Object.fromEntries(['claimsComplete','chineseCopyFaithful','subject','numbers','units','time','chain','stage','attribution','noSpeculationAsFact','notMarketing'].map(k => [k, true]));
const provider = await stub(async (_n, req) => {
  const request=JSON.parse(req.body),system=String(request.messages[0]?.content);
  const answer=(data:unknown)=>({choices:[{message:{content:JSON.stringify(data)}}]});
  if(system.includes('宽召回的 Web3 相关性预筛')) {
    if(pauseDuringPrefilter) await sql`INSERT INTO settings(key,value,updated_by)
      VALUES(${`automatic.source-safety.${pauseDuringPrefilter}`},${sql.json({cursor:0,streak:0,until:new Date(Date.now()+1800000).toISOString()})},'test')
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
    return answer({label:'PASS',reason:'local prefilter'});
  }
  if(system.includes('事件注意力评分器')) return answer({attentionScore:75});
  if(system.includes('资料结构化助手')) return answer({category:'infrastructure',tags:[],subjects:[],fact:null});
  if(system.includes('内容理解编辑')) return answer({itemType:'protocol_upgrade',authorRole:'principal',tags:[],editorialJudgment:'客户端维护更新',titleZh:'比特币客户端维护发布',summaryZh:'比特币客户端发布维护更新。'});
  const user = JSON.parse(request.messages.at(-1).content);
  if(String(request.messages[0].content).includes('依据已抓取材料修正')) return {choices:[{message:{content:JSON.stringify({titleZh:user.copy.titleZh,summaryZh:'比特币客户端维护更新已经发布。',reasonZh:null,category:'infrastructure'})}}]};
  return { choices: [{ message: { content: JSON.stringify({ verdict, claims: [{ claim: user.copy.titleZh, verdict,
    evidence: verdict === 'supported' ? [{ materialId: 'original', exactQuote: body }] : [], reason: 'local' }], checks, riskFlags: [], reason: 'local' }) } }] };
});
Object.assign(process.env, { LLM_BASE_URL: `${provider.url}/v1`, LLM_API_KEY: 'test-local-key', LLM_MODEL: 'qwen3.8-flash', VERIFICATION_MODEL: 'default', UNDERSTAND_MODEL: 'default', PREFILTER_MODEL: 'default', SCORE_MODEL: 'default', STRUCTURE_MODEL: 'default' });
invalidateModelCache();
const originalFetch=globalThis.fetch;
globalThis.fetch=(request,init)=>{
  const url=new URL(typeof request==='string'?request:request instanceof URL?request.href:request.url);
  assert.equal(url.hostname,'127.0.0.1','automatic report tests only call the local stub');
  return originalFetch(request,init);
};
const oldMode = config.editorialMode, oldCalls = config.modelCallsEnabled, oldDelay = config.selectedVisibleAfterSeconds;
config.editorialMode = 'automatic'; config.modelCallsEnabled = true; config.selectedVisibleAfterSeconds = 0;
let oldReport: any, oldLaunch: any, budgets: any[], reportId: number | undefined;
const key = beijingDate(new Date());
before(async () => {
  [oldReport] = await sql`SELECT id,active_version_id FROM reports WHERE kind='daily' AND key=${key}`;
  if(oldReport) await sql`UPDATE reports SET key=${`testbackup-${T}`},active_version_id=NULL WHERE id=${oldReport.id}`;
  [oldLaunch] = await sql`SELECT value FROM settings WHERE key='report_launch_start'`;
  budgets = await sql`SELECT * FROM budgets WHERE service='llm'`;
  await sql`UPDATE budgets SET per_minute=1000,per_hour=10000,per_day=100000 WHERE service='llm'`;
  await sql`INSERT INTO settings(key,value) VALUES('report_launch_start',${sql.json({ at: new Date().toISOString() })}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
  for (const id of [source, other]) {
    await sql`INSERT INTO sources(id,name,kind,config,tier,participation_mode,first_party,next_fetch_at) VALUES(${id},'local report primary','rss','{}','T1','editorial',true,'2100-01-01')`;
    await setSourceAutoPublic(id, { enabled: true, version: 0, reason: 'local test' }, 'test');
  }
});
after(async () => {
  if (reportId) await sql`DELETE FROM reports WHERE id=${reportId!}`;
  if(oldReport) await sql`UPDATE reports SET key=${key},active_version_id=${oldReport.active_version_id} WHERE id=${oldReport.id}`;
  if (oldLaunch) await sql`UPDATE settings SET value=${sql.json(oldLaunch.value)} WHERE key='report_launch_start'`; else await sql`DELETE FROM settings WHERE key='report_launch_start'`;
  for (const b of budgets ?? []) await sql`UPDATE budgets SET per_minute=${b.per_minute},per_hour=${b.per_hour},per_day=${b.per_day} WHERE service=${b.service}`;
  globalThis.fetch=originalFetch;
  config.editorialMode=oldMode; config.modelCallsEnabled=oldCalls; config.selectedVisibleAfterSeconds=oldDelay;
  await provider.close(); await stopBoss(); await closeDb();
});
async function article(opts: { source?: string; verified?: boolean; selected?: boolean; backfill?: boolean; age?: number; noDate?: boolean } = {}) {
  const { articleId: id } = await upsertMaterial({ sourceId: opts.source ?? source, url: `https://bitcoincore.org/${T}/${++serial}`, title: 'Bitcoin Core maintenance release', bodyText: body, bodyStatus: 'ok', via: 'fetch', publishedAt: opts.noDate ? undefined : new Date(Date.now() - (opts.age ?? 1000)) });
  if (opts.backfill) await sql`UPDATE articles SET backfill=true,backfill_reason='first-import' WHERE id=${id}`;
  await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected,output) VALUES(${id},1,'model','pass','infrastructure','比特币客户端维护发布','比特币客户端发布维护更新。',75,true,${sql.json({ scores: opts.selected === false ? [30,31] : [75,76], threshold: 60, itemType: 'protocol_upgrade', authorRole: 'principal', writer: 'understand' })})`;
  await sql`UPDATE articles SET processing_state='analyzed',grouped_at=now() WHERE id=${id}`;
  await sql.begin(tx => queueAutomaticVerificationTx(tx,id));
  if (opts.verified !== false) await verifyAutomaticArticle(id);
  return id;
}
async function automatic() { return import('../packages/backend/src/reports/automatic.ts'); }
test('automatic prepared snapshot stays private and refuses changed candidate or tampered report copy', async () => {
  const id=await article(), automaticReports=await automatic();
  const draft=await automaticReports.prepareAutomaticDaily(new Date(Date.now()+1000));
  const [identity]=await sql`SELECT id FROM reports WHERE kind='daily' AND key=${key}`;reportId=identity!.id;
  assert.equal(await loadReport('daily',key),null);
  await sql`UPDATE report_drafts SET content=jsonb_set(content,'{lead}', '{"title":"unverified fabricated conclusion"}'::jsonb) WHERE id=${draft.draftId}`;
  await assert.rejects(automaticReports.publishPreparedAutomaticDaily(draft.draftId), /变化|重新/);
  const fresh=await automaticReports.prepareAutomaticDaily(new Date(Date.now()+1000));
  await sql`UPDATE articles SET body_text='Corrected material before publication' WHERE id=${id}`;
  await assert.rejects(automaticReports.publishPreparedAutomaticDaily(fresh.draftId), /变化|重新/);
  await sql`UPDATE reports SET key='2000-01-01' WHERE id=${reportId!}`;
  await assert.rejects(automaticReports.publishPreparedAutomaticDaily(fresh.draftId), /日期|重新/);
  await sql`DELETE FROM reports WHERE id=${reportId!}`;reportId=undefined;
});
test('automatic daily publishes current verified selections, admits recent first import, skips private/unselected/history and reruns without AI', async () => {
  const accepted=await article(), recent=await article({backfill:true}), history=await article({backfill:true,age:49*3600000}), pending=await article({verified:false}), low=await article({selected:false}), noDate=await article({noDate:true});
  const hits=provider.hits();
  const result=await (await automatic()).publishAutomaticDaily(new Date(Date.now()+1000));
  assert.equal(result.status,'published');
  [ { id: reportId } ] = await sql`SELECT id FROM reports WHERE kind='daily' AND key=${key}` as any;
  const report=await loadReport('daily',key);
  const ids=report!.sections.flatMap(s=>s.items).filter(i=>i.available).map(i=>i.itemId);
  assert.ok(ids.includes(accepted)); assert.ok(ids.includes(recent));
  for(const id of [history,pending,low,noDate]) assert.ok(!ids.includes(id));
  const [version]=await sql`SELECT content FROM report_versions WHERE report_id=${reportId!}`;
  const [acceptedMaterial]=await sql`SELECT published_at FROM articles WHERE id=${accepted}`;
  const frozen=version!.content.sections.flatMap((s:any)=>s.items).find((i:any)=>i.itemId===accepted);
  assert.equal(frozen.publishedAt,acceptedMaterial!.published_at.toISOString(),'automatic issue retains the source date, not discovery date');
  assert.equal(report!.lead,null); assert.equal(provider.hits(),hits);
  const replay=await (await automatic()).publishAutomaticDaily(); assert.equal(replay.status,'skipped');
  const [count]=await sql`SELECT count(*)::int AS n FROM report_versions WHERE report_id=${reportId!}`; assert.equal(count!.n,1);
  const [audit]=await sql`SELECT published_by FROM report_versions WHERE report_id=${reportId!}`; assert.equal(audit!.published_by,'automatic-policy');
  const [original]=await sql`SELECT published_at FROM articles WHERE id=${recent}`; assert.ok(original!.published_at.getTime()<=Date.now());
  const warmIndex=await listReports('daily'); assert.ok(warmIndex.some(r=>r.key===key));
  await sql`UPDATE automatic_verifications SET automatic_rule_version=${`obsolete:${AUTOMATIC_RULE_VERSION}`} WHERE article_id IN (${accepted},${recent})`;
  assert.ok(!JSON.stringify(await loadReport('daily',key)).includes('比特币客户端维护发布'), 'old-rule report citations are redacted even while stored item projections remain public');
  assert.ok(!JSON.stringify(await v1Daily(key)).includes('比特币客户端发布维护更新。'));
  assert.notEqual((await listReports('daily')).find(r=>r.key===key)?.title,'比特币客户端维护发布');
  await sql`UPDATE automatic_verifications SET automatic_rule_version=${AUTOMATIC_RULE_VERSION} WHERE article_id IN (${accepted},${recent})`;
  await sql`UPDATE articles SET body_text='Unversioned original correction' WHERE id IN (${accepted},${recent})`;
  const withdrawn=await loadReport('daily',key);
  assert.ok(withdrawn!.sections.flatMap(s=>s.items).filter(i=>[accepted,recent].includes(i.itemId!)).every(i=>!i.available&&i.summary===null&&i.sourceUrl===''));
  assert.ok(!JSON.stringify(withdrawn).includes('比特币客户端维护发布'),'stale citation titles must be absent from the public report DTO even after warming its index');
  assert.ok(withdrawn!.sections.flatMap(s=>s.items).filter(i=>[accepted,recent].includes(i.itemId!)).every(i=>i.title==='该条内容已不可用'));
  assert.ok(!JSON.stringify(await v1Daily(key)).includes('比特币客户端发布维护更新。'));
  const index=await listReports('daily'); assert.notEqual(index.find(r=>r.key===key)?.title,'比特币客户端维护发布','withdrawn own title cannot lead the index; unrelated valid fixtures may still be cited');
});
test('empty automatic window is skipped without creating an empty public report',async()=>{
  if(reportId){await sql`DELETE FROM reports WHERE id=${reportId!}`;reportId=undefined;}
  await sql`UPDATE settings SET value=${sql.json({at:new Date(Date.now()+1000).toISOString()})} WHERE key='report_launch_start'`;
  assert.equal((await (await automatic()).publishAutomaticDaily()).status,'skipped');
  assert.equal(await loadReport('daily',key),null);
});
test('five terminal explicit contradictions persist one source pause; restart/TTL do not retrigger old rows, other source continues and no attempts are spent while paused',async()=>{
  verdict='contradicted';
  for(let i=0;i<5;i++) await article();
  verdict='supported';
  const safety=await import('../packages/backend/src/editorial/automatic-safety.ts');
  const until=await safety.sourcePauseUntil(source); assert.ok(until&&until.getTime()>Date.now());
  await safety.refreshAutomaticSafety(); assert.equal((await safety.sourcePauseUntil(source))!.getTime(),until!.getTime());
  assert.equal(await safety.sourcePauseUntil(other),null);
  const id=await article({verified:false}), hits=provider.hits(); await verifyAutomaticArticle(id); assert.equal(provider.hits(),hits);
  const { analyzeArticle }=await import('../packages/backend/src/editorial/analyze.ts');
  await assert.rejects(analyzeArticle(id,{attemptTag:'paused-test'}), /source verification pause/);
  const { processArticle }=await import('../packages/backend/src/jobs/content.ts');
  assert.equal((await processArticle(id,{attemptTag:'paused-worker-test'})).state,'source-paused');
  const [processing]=await sql`SELECT processing_attempts,processing_retry_at FROM articles WHERE id=${id}`;
  assert.equal(processing!.processing_attempts,0);assert.ok(processing!.processing_retry_at);assert.equal(provider.hits(),hits);
  const [r]=await sql`SELECT status,failures,verification_count,retry_at FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(r!.status,'waiting');assert.equal(r!.failures,0);assert.equal(r!.verification_count,0);assert.ok(r!.retry_at);
  const safe=await article({source:other});const [accepted]=await sql`SELECT status FROM automatic_verifications WHERE article_id=${safe}`;assert.equal(accepted!.status,'accepted');
  const later=new Date(until!.getTime()+1);await safety.refreshAutomaticSafety(later);assert.equal(await safety.sourcePauseUntil(source,later),null);
  const { automaticVerificationOverview }=await import('../packages/backend/src/admin/runs.ts');
  const statsHits=provider.hits();const overview=await automaticVerificationOverview();assert.equal(provider.hits(),statsHits);
  assert.ok(overview.counts.rejected>=5);assert.ok(overview.recent.some(r=>r.article_id===safe));
  assert.ok(overview.sourcePauses.some(s=>s.source_id===source));
  const [audits]=await sql`SELECT count(*)::int AS n FROM audit_log WHERE action='automatic.source-pause' AND subject=${`source:${source}`}`;assert.equal(audits!.n,1);
});

test('a pause persisted while prefilter is in flight prevents every later paid analysis step and preserves its received result',async()=>{
  const {articleId:id}=await upsertMaterial({sourceId:other,url:`https://bitcoincore.org/${T}/interleaved-${++serial}`,title:'Bitcoin Core maintenance release',bodyText:body,bodyStatus:'ok',via:'fetch',publishedAt:new Date()});
  pauseDuringPrefilter=other;
  const hits=provider.hits();
  const {processArticle}=await import('../packages/backend/src/jobs/content.ts');
  try {
    assert.equal((await processArticle(id,{attemptTag:'interleaved-pause'})).state,'source-paused');
    assert.equal(provider.hits()-hits,1,'only the already-started prefilter may be paid');
    const [article]=await sql`SELECT processing_state,processing_attempts,processing_retry_at FROM articles WHERE id=${id}`;
    assert.equal(article!.processing_state,'new');assert.equal(article!.processing_attempts,0);assert.ok(article!.processing_retry_at);
    const receipts=await sql`SELECT purpose,status,response FROM receipts WHERE subject=${`article:${id}@1`}`;
    assert.equal(receipts.length,1);assert.equal(receipts[0]!.purpose,'prefilter_article');
    assert.ok(['received','completed'].includes(receipts[0]!.status));assert.ok(receipts[0]!.response);
  } finally {pauseDuringPrefilter=null;}
});
