import { stub } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { config } from "@aihot/backend/config";
import { sql, closeDb } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { processArticle, queueProcessing } from "@aihot/backend/jobs/content";
import { skipIneligibleProcessing } from "@aihot/backend/content/freshness";
import { getBoss, QUEUES, stopBoss } from "@aihot/backend/jobs/queue";
import { composeDueReports } from "@aihot/backend/reports/compose";
import { rerun } from "@aihot/backend/admin/content";
import { REPORTS } from "@aihot/site";
import { publishArticle } from "@aihot/backend/publication/publish";
import { installModules, serverModules } from "@aihot/backend/modules";

const source = "ninebtc-cost-eligibility";
const oldHours = config.contentMaxAgeHours;
before(async () => {
  config.contentMaxAgeHours = 48;
  await sql`INSERT INTO sources (id, name, kind, tier) VALUES (${source}, 'Local cost fixture', 'rss', 'T1')`;
});
after(async () => { config.contentMaxAgeHours = oldHours; await stopBoss(); await closeDb(); });

test("stale, undated and future queued articles stop before extraction, queueing or any paid request", async () => {
  const count = (await sql`SELECT count(*) AS n FROM receipts`)[0]!.n;
  for (const [name, date] of [["expired", new Date(Date.now() - 49 * 3600_000)], ["undated", null], ["future", new Date(Date.now() + 2 * 3600_000)]] as const) {
    const { articleId } = await upsertMaterial({ sourceId: source, title: name, url: `https://example.invalid/${name}`, publishedAt: date, via: "fetch" });
    assert.equal(await queueProcessing(articleId), null);
    assert.deepEqual(await processArticle(articleId), { state: "skipped" });
    assert.equal((await sql`SELECT processing_state FROM articles WHERE id = ${articleId}`)[0]!.processing_state, "skipped");
  }
  assert.equal((await sql`SELECT count(*) AS n FROM receipts`)[0]!.n, count);
});

test("a source paused after queueing stops manual recovery too; existing analyses stay intact", async () => {
  const { articleId } = await upsertMaterial({ sourceId: source, title: "recent", url: "https://example.invalid/recent", publishedAt: new Date(), via: "fetch" });
  assert.equal(await skipIneligibleProcessing(articleId), false);
  await sql`UPDATE sources SET enabled = false WHERE id = ${source}`;
  assert.deepEqual(await processArticle(articleId, { attemptTag: "explicit-recovery" }), { state: "skipped" });
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${articleId}`;
  assert.equal(await skipIneligibleProcessing(articleId), true);
  assert.equal((await sql`SELECT processing_state FROM articles WHERE id = ${articleId}`)[0]!.processing_state, "analyzed");
  await sql`UPDATE sources SET enabled = true WHERE id = ${source}`;
});

test("an explicit historical re-evaluation retains its identity through extraction and recovery", async () => {
  const { articleId } = await upsertMaterial({ sourceId: source, title: "manual history", url: "https://example.invalid/manual-history", publishedAt: new Date(Date.now() - 49 * 3600_000), via: "fetch" });
  assert.equal(await skipIneligibleProcessing(articleId), true);
  await sql`UPDATE articles SET processing_state = 'new', processing_attempt_tag = 'admin:historical-replay', manual_processing = true WHERE id = ${articleId}`;
  assert.equal(await skipIneligibleProcessing(articleId), false, "extraction and resumed queues reuse the saved manual identity");
  await sql`UPDATE articles SET manual_processing = false WHERE id = ${articleId}`;
  assert.equal(await skipIneligibleProcessing(articleId), true, "an old paid identity is not a permanent authorization to replay history");
});

test("manual historical extraction survives restart eligibility without buying a new analysis identity", async () => {
  const { articleId } = await upsertMaterial({ sourceId: source, title: "manual extract", url: "https://example.invalid/manual-extract", publishedAt: new Date(Date.now() - 49 * 3600_000), via: "fetch" });
  const queued = await rerun(articleId, "extract", "historical-extract-approval", "local-test-admin");
  assert.ok(queued?.jobId);
  const [row] = await sql`SELECT manual_processing, processing_attempt_tag FROM articles WHERE id = ${articleId}`;
  assert.equal(row!.manual_processing, true);
  assert.equal(row!.processing_attempt_tag, null, "extraction keeps the upstream paid identity");
  assert.equal(await skipIneligibleProcessing(articleId), false);
  await sql`UPDATE sources SET enabled = false WHERE id = ${source}`;
  assert.equal(await skipIneligibleProcessing(articleId), true);
  await sql`UPDATE sources SET enabled = true WHERE id = ${source}`;
});

test("all report kinds are automatic without replaying historical report gaps", async () => {
  assert.deepEqual(REPORTS.automaticKinds, ["daily", "weekly", "monthly"]);
  assert.equal(REPORTS.catchUpHistory, false);
  const old = [...REPORTS.automaticKinds];
  REPORTS.automaticKinds = [];
  try {
    assert.deepEqual(await composeDueReports(new Date("2026-10-10T23:00:00Z")), { generated: [], failed: [] });
    assert.equal((await sql`SELECT count(*) AS n FROM receipts WHERE purpose IN ('report_weekly', 'report_monthly')`)[0]!.n, 0);
  } finally { REPORTS.automaticKinds = old; }
});

test("a completed current-revision analysis is preserved without a paid replay after an upstream upgrade", async () => {
  const { articleId } = await upsertMaterial({ sourceId: source, title: "already processed", url: "https://example.invalid/already-processed", publishedAt: new Date(), bodyText: "Stored source material", bodyStatus: "ok", via: "fetch" });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, title_zh, summary_zh, score, selected)
    VALUES (${articleId}, 1, 'rule', 'pass', '已完成的历史标题', '已完成的历史摘要', 80, true)`;
  await sql`UPDATE articles SET processing_state = 'analyzed', grouping_status = 'complete', processing_error = 'saved operational history',
    processing_attempts = 3, processing_queued_at = now() - interval '1 hour', processing_retry_at = now() + interval '1 hour' WHERE id = ${articleId}`;
  await publishArticle(articleId);
  const count = (await sql`SELECT count(*) AS n FROM receipts`)[0]!.n;
  const before = await sql`SELECT processing_state, processing_error, processing_attempts, processing_queued_at, processing_retry_at FROM articles WHERE id = ${articleId}`;
  assert.equal(await queueProcessing(articleId), null);
  assert.deepEqual(await processArticle(articleId), { state: "already-analyzed" });
  const after = await sql`SELECT processing_state, processing_error, processing_attempts, processing_queued_at, processing_retry_at FROM articles WHERE id = ${articleId}`;
  assert.deepEqual([...after], [...before], "completed work preserves its state and operational history without any write");
  assert.equal((await sql`SELECT count(*) AS n FROM receipts`)[0]!.n, count);
  assert.equal((await sql`SELECT count(*) AS n FROM analyses WHERE article_id = ${articleId}`)[0]!.n, 1);
});

async function savedFixture(name: string, state = "analyzed") {
  const { articleId } = await upsertMaterial({ sourceId: source, title: name, url: `https://example.invalid/${name}`, publishedAt: new Date(), bodyText: "Stored original source material. ".repeat(20), bodyStatus: "ok", via: "fetch" });
  const [analysis] = await sql<{id:number}[]>`INSERT INTO analyses(article_id,input_revision,origin,prompt_version,relevance,title_zh,summary_zh,selected)
    VALUES(${articleId},1,'rule','pre-upgrade-prompt','pass','保存的新闻标题','保存的新闻摘要',false) RETURNING id`;
  await sql`UPDATE articles SET processing_state=${state} WHERE id=${articleId}`;
  return {articleId, analysisId:analysis!.id};
}

test("a committed analysis recovers its missing publication and grouping without extraction or paid replay", async () => {
  const {articleId,analysisId}=await savedFixture("committed-before-publication");
  await sql`UPDATE articles SET body_status='pending',body_text=NULL WHERE id=${articleId}`;
  const receipts=(await sql`SELECT count(*) AS n FROM receipts`)[0]!.n;
  const jobId=await queueProcessing(articleId,{step:"extract"});
  assert.ok(jobId,"saved analysis still has unfinished publication work");
  assert.equal((await sql`SELECT name FROM pgboss.job WHERE id=${jobId}`)[0]!.name,QUEUES.analyze,"resume after analysis instead of fetching a new paid body");
  assert.deepEqual(await processArticle(articleId),{state:"pass"});
  assert.equal((await sql`SELECT analysis_id FROM publications WHERE article_id=${articleId}`)[0]!.analysis_id,analysisId);
  assert.equal((await sql`SELECT count(*) AS n FROM analyses WHERE article_id=${articleId}`)[0]!.n,1);
  assert.equal((await sql`SELECT count(*) AS n FROM receipts`)[0]!.n,receipts,"saved analysis recovery buys no model or extraction request");
  assert.equal((await sql`SELECT count(*) AS n FROM pgboss.job WHERE name=${QUEUES.group} AND data->>'articleId'=${articleId}`)[0]!.n,1);
});

test("a saved publication with pending grouping resumes a failed chain without replacing its analysis", async () => {
  const {articleId,analysisId}=await savedFixture("published-before-grouping","failed");
  await publishArticle(articleId);
  const receipts=(await sql`SELECT count(*) AS n FROM receipts`)[0]!.n;
  assert.ok(await queueProcessing(articleId));
  assert.deepEqual(await processArticle(articleId),{state:"pass"});
  const [row]=await sql`SELECT processing_state,grouping_status FROM articles WHERE id=${articleId}`;
  assert.deepEqual({...row},{processing_state:"analyzed",grouping_status:"pending"});
  assert.equal((await sql`SELECT analysis_id FROM publications WHERE article_id=${articleId}`)[0]!.analysis_id,analysisId);
  assert.equal((await sql`SELECT count(*) AS n FROM analyses WHERE article_id=${articleId}`)[0]!.n,1);
  assert.equal((await sql`SELECT count(*) AS n FROM receipts`)[0]!.n,receipts);
  const [job]=await sql`SELECT id FROM pgboss.job WHERE name=${QUEUES.group} AND data->>'articleId'=${articleId}`;
  assert.ok(job,"only the unfinished original grouping task is resumed");
  const boss=await getBoss();
  await boss.complete(QUEUES.group,job!.id);
  await sql`UPDATE articles SET grouping_status='complete' WHERE id=${articleId}`;
  await publishArticle(articleId);
  assert.equal(await queueProcessing(articleId),null);
  assert.deepEqual(await processArticle(articleId),{state:"already-analyzed"});
  assert.equal((await sql`SELECT count(*) AS n FROM pgboss.job WHERE name=${QUEUES.group} AND data->>'articleId'=${articleId}`)[0]!.n,1,"completed grouping is not rerun after prompt changes");
});

test("saved analysis recovery still respects expired material and a paused source", async () => {
  for(const reason of ["expired","paused"] as const) {
    const {articleId}=await savedFixture(`saved-but-${reason}`);
    if(reason==="expired")await sql`UPDATE articles SET published_at=now()-interval '49 hours' WHERE id=${articleId}`;
    else await sql`UPDATE sources SET enabled=false WHERE id=${source}`;
    try {
      assert.equal(await queueProcessing(articleId),null);
      assert.deepEqual(await processArticle(articleId),{state:"skipped"});
      assert.equal((await sql`SELECT count(*) AS n FROM publications WHERE article_id=${articleId}`)[0]!.n,0);
      assert.equal((await sql`SELECT count(*) AS n FROM analyses WHERE article_id=${articleId}`)[0]!.n,1);
    } finally {if(reason==="paused")await sql`UPDATE sources SET enabled=true WHERE id=${source}`;}
  }
});

test("explicit manual re-evaluation and a new input revision can still buy their own analysis", async () => {
  const provider=await stub(()=>({choices:[{message:{content:'{"label":"BLOCK","reason":"local explicit decision"}'}}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}}));
  const keys=["PREFILTER_MODEL","LLM_MODEL","LLM_BASE_URL","LLM_API_KEY"];
  const prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{PREFILTER_MODEL:"default",LLM_MODEL:"local-cost-replay",LLM_BASE_URL:provider.url,LLM_API_KEY:"local-test-key"});
  try {
    for(const kind of ["manual","new-revision"] as const) {
      const {articleId,analysisId}=await savedFixture(`allowed-${kind}`);
      await sql`UPDATE articles SET grouping_status='complete' WHERE id=${articleId}`;
      await publishArticle(articleId);
      if(kind==="manual")await sql`UPDATE articles SET manual_processing=true,processing_state='new',processing_attempt_tag='admin:explicit-re-evaluation' WHERE id=${articleId}`;
      else {
        const revised=await upsertMaterial({sourceId:source,url:`https://example.invalid/allowed-${kind}`,title:"Revised source material",bodyText:"A new original material revision. ".repeat(20),bodyStatus:"ok",publishedAt:new Date(),via:"fetch"});
        assert.equal(revised.revised,true);
      }
      const hits=provider.hits();
      assert.deepEqual(await processArticle(articleId,kind==="manual"?{attemptTag:"admin:explicit-re-evaluation"}:{}),{state:"block"});
      assert.equal(provider.hits(),hits+1,"only the newly authorized evaluation buys its prefilter");
      assert.equal((await sql`SELECT count(*) AS n FROM analyses WHERE article_id=${articleId}`)[0]!.n,2);
      assert.equal((await sql`SELECT count(*) AS n FROM analyses WHERE id=${analysisId}`)[0]!.n,1,"the saved analysis remains intact");
      const [latest]=await sql`SELECT input_revision FROM analyses WHERE article_id=${articleId} ORDER BY id DESC LIMIT 1`;
      assert.equal(latest!.input_revision,kind==="manual"?1:2);
    }
  } finally {
    for(const [key,value] of Object.entries(prior))if(value===undefined)delete process.env[key];else process.env[key]=value;
    await provider.close();
  }
});


test("restoring a stale publication emits the upstream content-change hook in the recovery transaction", async () => {
  const { articleId, analysisId: previousAnalysis } = await savedFixture("saved-after-old-projection");
  await publishArticle(articleId);
  const [analysis] = await sql<{ id: number }[]>`INSERT INTO analyses (article_id, input_revision, origin, prompt_version, relevance, title_zh, summary_zh, selected)
    VALUES (${articleId}, 1, 'rule', 'saved-current-prompt', 'pass', '更新后保存的新闻标题', '更新后保存的新闻摘要', false) RETURNING id`;
  const installed = serverModules();
  const hookKey = `recovery-change:${articleId}`;
  let hookFails = true;
  installModules([{ name: "recovery-change-test", on: { articleChanged: async (change, tx) => {
    await tx`INSERT INTO settings (key, value) VALUES (${hookKey}, ${tx.json(change)})`;
    if (hookFails) throw new Error("temporary recovery hook failure");
  } } }]);
  try {
    assert.equal((await processArticle(articleId)).state, "retrying");
    assert.equal((await sql`SELECT analysis_id FROM publications WHERE article_id = ${articleId}`)[0]!.analysis_id, previousAnalysis, "a failed hook rolls back publication recovery");
    assert.equal((await sql`SELECT count(*) AS n FROM settings WHERE key = ${hookKey}`)[0]!.n, 0);
    assert.equal((await sql`SELECT count(*) AS n FROM pgboss.job WHERE name = ${QUEUES.group} AND data->>'articleId' = ${articleId}`)[0]!.n, 0);
    hookFails = false;
    assert.deepEqual(await processArticle(articleId), { state: "pass" });
    assert.equal((await sql`SELECT analysis_id FROM publications WHERE article_id = ${articleId}`)[0]!.analysis_id, analysis!.id);
    const [hook] = await sql`SELECT value FROM settings WHERE key = ${hookKey}`;
    assert.ok(hook, "a changed existing projection invalidates its module caches");
    assert.equal(hook.value.id, articleId);
    assert.equal(hook.value.reason, "republication");
    assert.deepEqual(await processArticle(articleId), { state: "pass" });
    assert.equal((await sql`SELECT count(*) AS n FROM settings WHERE key = ${hookKey}`)[0]!.n, 1, "the saved current projection is not rewritten on the next recovery");
  } finally { installModules(installed); }
});


async function withLocalBlockModel(run: (provider: Awaited<ReturnType<typeof stub>>) => Promise<void>, answer?: () => Promise<void>) {
  const provider = await stub(async () => {
    await answer?.();
    return { choices: [{ message: { content: '{"label":"BLOCK","reason":"local explicit decision"}' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  const keys = ["PREFILTER_MODEL", "LLM_MODEL", "LLM_BASE_URL", "LLM_API_KEY"];
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { PREFILTER_MODEL: "default", LLM_MODEL: "local-manual-finish", LLM_BASE_URL: provider.url, LLM_API_KEY: "local-test-key" });
  try { await run(provider); } finally {
    for (const [key, value] of Object.entries(prior)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    await provider.close();
  }
}

test("a committed manual analysis closes its authorization before publication and survives a model change without buying again", async () => {
  await withLocalBlockModel(async provider => {
    const { articleId } = await savedFixture("manual-crash-before-publication");
    const requestId = "manual-crash-before-publication";
    await rerun(articleId, "analyze", requestId, "local-test-admin");
    await sql.unsafe(`CREATE FUNCTION refuse_manual_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'temporary publication failure'; END $$`);
    await sql.unsafe("CREATE TRIGGER refuse_manual_publication BEFORE INSERT ON publications FOR EACH ROW EXECUTE FUNCTION refuse_manual_publication()");
    try {
      assert.equal((await processArticle(articleId, { attemptTag: `admin:${requestId}` })).state, "retrying");
    } finally {
      await sql.unsafe("DROP TRIGGER refuse_manual_publication ON publications");
      await sql.unsafe("DROP FUNCTION refuse_manual_publication()");
    }
    assert.equal((await sql`SELECT manual_processing FROM articles WHERE id = ${articleId}`)[0]!.manual_processing, false, "saved manual results atomically end the exception to normal processing policy");
    const hits = provider.hits();
    process.env.LLM_MODEL = "local-manual-after-deploy";
    assert.deepEqual(await processArticle(articleId, { attemptTag: `admin:${requestId}` }), { state: "block" });
    assert.equal(provider.hits(), hits, "a deployment after the saved result cannot buy the manual evaluation again");
    assert.equal((await sql`SELECT count(*) AS n FROM analyses WHERE article_id = ${articleId}`)[0]!.n, 2);
  });
});

test("a late old manual worker cannot close a newer manual request for the same revision", async () => {
  let entered!: () => void;
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const proceed = new Promise<void>(resolve => { release = resolve; });
  await withLocalBlockModel(async () => {
    const { articleId } = await savedFixture("manual-request-race");
    await rerun(articleId, "analyze", "manual-request-race-old", "local-test-admin");
    const running = processArticle(articleId, { attemptTag: "admin:manual-request-race-old" });
    await waiting;
    try { await rerun(articleId, "analyze", "manual-request-race-new", "local-test-admin"); }
    finally { release(); }
    assert.deepEqual(await running, { state: "stale" });
    const [current] = await sql`SELECT manual_processing, processing_attempt_tag, processing_state FROM articles WHERE id = ${articleId}`;
    assert.deepEqual({ ...current }, { manual_processing: true, processing_attempt_tag: "admin:manual-request-race-new", processing_state: "new" });
  }, async () => { entered(); await proceed; });
});

test("completed non-editorial manual work and extracted signals close their manual exception", async () => {
  await sql`UPDATE sources SET participation_mode = 'hot_signal' WHERE id = ${source}`;
  try {
    const { articleId } = await savedFixture("manual-signal-analysis");
    await rerun(articleId, "analyze", "manual-signal-analysis", "local-test-admin");
    assert.deepEqual(await processArticle(articleId, { attemptTag: "admin:manual-signal-analysis" }), { state: "skipped" });
    assert.equal((await sql`SELECT manual_processing FROM articles WHERE id = ${articleId}`)[0]!.manual_processing, false);
    const { articleId: extracted } = await savedFixture("manual-extracted-signal");
    await rerun(extracted, "extract", "manual-extracted-signal", "local-test-admin");
    await sql`UPDATE articles SET body_status = 'ok' WHERE id = ${extracted}`;
    const jobId = await queueProcessing(extracted);
    assert.ok(jobId);
    assert.equal((await sql`SELECT name FROM pgboss.job WHERE id = ${jobId}`)[0]!.name, QUEUES.group);
    assert.equal((await sql`SELECT manual_processing FROM articles WHERE id = ${extracted}`)[0]!.manual_processing, false, "successful extraction-to-group handoff ends the manual exception atomically");
  } finally { await sql`UPDATE sources SET participation_mode = 'editorial' WHERE id = ${source}`; }
});


test("an obsolete queued manual request stops before paying after a newer request takes its place", async () => {
  await withLocalBlockModel(async provider => {
    const { articleId } = await savedFixture("manual-obsolete-queued");
    await rerun(articleId, "analyze", "manual-obsolete-queued-old", "local-test-admin");
    await rerun(articleId, "analyze", "manual-obsolete-queued-new", "local-test-admin");
    const hits = provider.hits();
    assert.deepEqual(await processArticle(articleId, { attemptTag: "admin:manual-obsolete-queued-old" }), { state: "stale" });
    assert.equal(provider.hits(), hits, "the obsolete manual request has no authority to buy another result");
    const [current] = await sql`SELECT manual_processing, processing_attempt_tag, processing_state FROM articles WHERE id = ${articleId}`;
    assert.deepEqual({ ...current }, { manual_processing: true, processing_attempt_tag: "admin:manual-obsolete-queued-new", processing_state: "new" });
  });
});


test("a superseded same-revision response arriving last cannot replace the newer manual judgement", async () => {
  let entered!: () => void;
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const proceed = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await withLocalBlockModel(async () => {
    const { articleId } = await savedFixture("manual-last-response-race");
    await rerun(articleId, "analyze", "manual-last-response-race-old", "local-test-admin");
    const old = processArticle(articleId, { attemptTag: "admin:manual-last-response-race-old" });
    await waiting;
    let newest!: number;
    try {
      await rerun(articleId, "analyze", "manual-last-response-race-new", "local-test-admin");
      assert.deepEqual(await processArticle(articleId, { attemptTag: "admin:manual-last-response-race-new" }), { state: "block" });
      newest = (await sql`SELECT id FROM analyses WHERE article_id = ${articleId} ORDER BY id DESC LIMIT 1`)[0]!.id;
    } finally { release(); }
    assert.deepEqual(await old, { state: "stale" });
    assert.equal((await sql`SELECT id FROM analyses WHERE article_id = ${articleId} ORDER BY id DESC LIMIT 1`)[0]!.id, newest, "the obsolete response cannot become the latest saved judgement");
    assert.equal((await sql`SELECT analysis_id FROM publications WHERE article_id = ${articleId}`)[0]!.analysis_id, newest);
    assert.equal((await sql`SELECT count(*) AS n FROM analyses WHERE article_id = ${articleId}`)[0]!.n, 2);
    assert.deepEqual(await processArticle(articleId), { state: "already-analyzed" });
    const receipts = await sql`SELECT status FROM receipts WHERE subject = ${`article:${articleId}@1`}`;
    assert.equal(receipts.length, 2, "both purchased responses remain traceable");
    assert.ok(receipts.every(row => row.status === "completed"));
  }, async () => { if (++requests === 1) { entered(); await proceed; } });
});


test("an expired explicitly saved manual judgement recovers only its cached result and still stops for a paused source", async () => {
  await withLocalBlockModel(async provider => {
    const { articleId } = await savedFixture("historical-manual-publication-crash");
    await sql`UPDATE articles SET published_at = now() - interval '49 hours' WHERE id = ${articleId}`;
    const requestId = "historical-manual-publication-crash";
    await rerun(articleId, "analyze", requestId, "local-test-admin");
    await sql.unsafe(`CREATE FUNCTION refuse_historical_manual_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'temporary historical publication failure'; END $$`);
    await sql.unsafe("CREATE TRIGGER refuse_historical_manual_publication BEFORE INSERT ON publications FOR EACH ROW EXECUTE FUNCTION refuse_historical_manual_publication()");
    try {
      assert.equal((await processArticle(articleId, { attemptTag: `admin:${requestId}` })).state, "retrying");
    } finally {
      await sql.unsafe("DROP TRIGGER refuse_historical_manual_publication ON publications");
      await sql.unsafe("DROP FUNCTION refuse_historical_manual_publication()");
    }
    const [saved] = await sql`SELECT manual_processing, processing_attempt_tag FROM articles WHERE id = ${articleId}`;
    assert.deepEqual({ ...saved }, { manual_processing: false, processing_attempt_tag: `admin:${requestId}` });
    const hits = provider.hits();
    process.env.LLM_MODEL = "local-after-historical-deploy";
    await sql`UPDATE sources SET enabled = false WHERE id = ${source}`;
    try {
      assert.equal(await queueProcessing(articleId), null);
      assert.deepEqual(await processArticle(articleId), { state: "skipped" });
      assert.equal((await sql`SELECT count(*) AS n FROM publications WHERE article_id = ${articleId}`)[0]!.n, 0);
    } finally { await sql`UPDATE sources SET enabled = true WHERE id = ${source}`; }
    assert.equal(await skipIneligibleProcessing(articleId, sql, true), false, "the saved explicit manual result can finish its incomplete projection without age blocking");
    assert.equal(await skipIneligibleProcessing(articleId), true, "the cache-only exception does not reopen extraction or paid analysis authorization");
    assert.deepEqual(await processArticle(articleId), { state: "block" });
    assert.equal(provider.hits(), hits, "cache-only historical recovery cannot buy the changed model");
    assert.equal((await sql`SELECT count(*) AS n FROM analyses WHERE article_id = ${articleId}`)[0]!.n, 2);
    assert.equal((await sql`SELECT manual_processing FROM articles WHERE id = ${articleId}`)[0]!.manual_processing, false);
    assert.equal((await sql`SELECT count(*) AS n FROM publications WHERE article_id = ${articleId}`)[0]!.n, 1);
    assert.equal(await skipIneligibleProcessing(articleId), true, "completion closes this cache-only age exception");
  });
});
