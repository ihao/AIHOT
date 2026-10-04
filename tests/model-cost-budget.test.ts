import { gate, stub, tag } from './setup.ts';
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { paidRequest, BudgetExceededError, logicalKeyFor, ProviderRejectedError, rejectReceivedResponse, type ReceiptRequest } from '@aihot/backend/providers/receipts';
import { chatJsonRequestIdentity, chatJson } from '@aihot/backend/providers/llm';
import { modelCostOverview } from '@aihot/backend/providers/model-cost';
import { ensureEmbeddings } from '@aihot/backend/providers/embeddings';
import { sha256 } from '@aihot/backend/lib/ids';
import { autoReleaseUnknownReceipts, releaseReceipt } from '@aihot/backend/admin/runs';
import { z } from 'zod';

const prefix = `money-${tag()}`;
const service = `${prefix}-a`, otherService = `${prefix}-b`;
let previousTimes: { id: number; started_at: Date }[] = [];
before(async () => {
  // Only this disposable DB is touched; restore earlier suites' timestamps on exit.
  previousTimes = await sql<{ id: number; started_at: Date }[]>`SELECT id,started_at FROM receipt_attempts WHERE started_at>now()-interval '24 hours'`;
  await sql`UPDATE receipt_attempts SET started_at=now()-interval '2 days' WHERE started_at>now()-interval '24 hours'`;
  for (const s of [service,otherService]) await sql`INSERT INTO service_prices(service,model,currency,input_per_mtok,output_per_mtok,cached_per_mtok,source_url,verified_on)
    VALUES(${s},'bounded','CNY',1000000,1000000,100000,'https://example.invalid/operator-verified',current_date)`;
});
beforeEach(async () => {
  await sql`DELETE FROM receipts WHERE service IN (${service},${otherService}) OR subject LIKE ${prefix+'%'}`;
  await sql`UPDATE model_cost_policy SET enabled=false,day_limit_cny=9,rolling_limit_cny=9 WHERE id=1`;
});
after(async () => {
  await sql`UPDATE model_cost_policy SET enabled=false,day_limit_cny=9,rolling_limit_cny=9 WHERE id=1`;
  await sql`DELETE FROM receipts WHERE service IN (${service},${otherService}) OR subject LIKE ${prefix+'%'}`;
  await sql`DELETE FROM service_prices WHERE service IN (${service},${otherService})`;
  for (const r of previousTimes) await sql`UPDATE receipt_attempts SET started_at=${r.started_at} WHERE id=${r.id}`;
  await closeDb();
});
const request = (suffix: string, svc=service): ReceiptRequest => ({ service:svc,model:'bounded',purpose:'money-test',subject:`${prefix}-${suffix}`,identity:{suffix},
  modelBudget:{ inputTokens:1,maxOutputTokens:1,bounded:true }, requestSummary:{inputTokenBound:1,maxTokens:1} } as ReceiptRequest);
const enable = (day=9,rolling=9) => sql`UPDATE model_cost_policy SET enabled=true,day_limit_cny=${day},rolling_limit_cny=${rolling} WHERE id=1`;
const success = async () => ({response:{ok:true},usage:{prompt_tokens:1,completion_tokens:0,total_tokens:1}});
const attempt = async (req: ReceiptRequest) => (await sql`SELECT a.* FROM receipt_attempts a JOIN receipts r ON r.id=a.receipt_id WHERE r.subject=${req.subject??null} ORDER BY a.attempt DESC`)[0]!;

test('the money policy is opt-in and keeps both nine yuan limits', async () => {
  const [table] = await sql<{ name: string | null }[]>`SELECT to_regclass('model_cost_policy')::text AS name`;
  assert.equal(table?.name, 'model_cost_policy', 'the incremental migration installs the money policy');
  const [policy] = await sql`SELECT enabled, timezone, day_limit_cny, rolling_limit_cny FROM model_cost_policy WHERE id=1`;
  assert.deepEqual(policy, { enabled: false, timezone: 'Asia/Shanghai', day_limit_cny: 9, rolling_limit_cny: 9 });
});

test('all model services atomically share the money limit before sending', async () => {
  await enable(3,3);
  const hold=gate(),started=gate();let sent=0;
  const first=paidRequest(request('first'),async()=>{sent++;started.open();await hold.promise;return success();});
  // The first reservation is committed before the provider is entered.
  await Promise.race([started.promise,first]);
  try {
    await assert.rejects(paidRequest(request('second',otherService),async()=>{sent++;return success();}),BudgetExceededError);
    assert.equal(sent,1);
    assert.equal((await attempt(request('first'))).model_cost_cny,2);
  } finally {hold.open();await first;}
  assert.equal((await attempt(request('first'))).model_cost_cny,1);
});

test('missing verified CNY price or reliable bounds freezes only new purchases', async () => {
  const req=request('reuse');const saved=await paidRequest(req,success);
  await enable();
  await sql`UPDATE service_prices SET verified_on=NULL WHERE service=${service}`;
  try {
    assert.equal((await paidRequest(req,async()=>assert.fail('cache cannot send'))).receiptId,saved.receiptId);
    await assert.rejects(paidRequest(request('new'),success),BudgetExceededError);
  } finally {await sql`UPDATE service_prices SET verified_on=current_date WHERE service=${service}`;}
  await assert.rejects(paidRequest({...request('unbounded'),modelBudget:{inputTokens:1,maxOutputTokens:1,bounded:false}} as ReceiptRequest,success),BudgetExceededError);
});

test('price snapshots settle cache-hit usage but never pretend to be a provider bill', async () => {
  await enable();const req=request('cache');
  await paidRequest(req,async()=>{
    await sql`UPDATE service_prices SET input_per_mtok=2000000 WHERE service=${service}`;
    return {response:{},usage:{prompt_tokens:1,completion_tokens:0,total_tokens:1,prompt_tokens_details:{cached_tokens:1}}};
  });
  const row=await attempt(req);
  assert.equal(row.model_cost_reserved_cny,2);
  assert.equal(row.model_cost_cny,.1);
  assert.equal(row.cost,.1);assert.equal(row.cost_basis,'estimated');assert.equal(row.currency,'CNY');
  await sql`UPDATE service_prices SET input_per_mtok=1000000 WHERE service=${service}`;
});

test('absent, malformed and out-of-bound usage retains the full reservation', async () => {
  await enable(20,20);
  for(const [i,usage] of [null,{prompt_tokens:-1,completion_tokens:0},{prompt_tokens:2,completion_tokens:0,total_tokens:2},{prompt_tokens:1,completion_tokens:0,prompt_tokens_details:{cached_tokens:2}}].entries()) {
    const req=request(`badusage${i}`);await paidRequest(req,async()=>({response:{},usage}));
    const row=await attempt(req);assert.ok(row.model_cost_cny>=2);assert.equal(row.model_cost_state,'retained');
  }
});

test('nonaccepted 429 releases, 5xx and send timeout retain, and retries reserve again', async () => {
  await enable(20,20);
  const rejected=request('429');await assert.rejects(paidRequest(rejected,async()=>{throw new ProviderRejectedError('HTTP 429: limit',429,true);}));
  assert.equal((await attempt(rejected)).model_cost_cny,0);
  const server=request('503');await assert.rejects(paidRequest(server,async()=>{throw new ProviderRejectedError('HTTP 503: unknown bill',503,true);}));
  assert.equal((await attempt(server)).model_cost_cny,2);assert.equal((await attempt(server)).status,'unknown');
  const lost=request('lost');await assert.rejects(paidRequest(lost,async()=>{throw new Error('send timeout');}));
  await sql`UPDATE receipts SET updated_at=now()-interval '31 minutes' WHERE subject=${lost.subject??null}`;
  await autoReleaseUnknownReceipts();assert.equal((await attempt(lost)).status,'unknown');
  const id=(await attempt(lost)).receipt_id;
  await releaseReceipt(id,{billed:true,note:'confirmed paid'},'test');
  assert.equal((await attempt(lost)).model_cost_cny,2);
  await paidRequest(lost,success);
  const [sum]=await sql`SELECT sum(model_cost_cny) AS amount FROM receipt_attempts WHERE receipt_id=${id}`;
  assert.equal(sum!.amount,3);
  await releaseReceipt((await attempt(server)).receipt_id,{billed:false,note:'confirmed no bill'},'test');
  assert.equal((await attempt(server)).model_cost_cny,0);
});

test('a fresh paid attempt after unusable output keeps the prior settled amount',async()=>{
  await enable(3,3);const req=request('unusable');const received=await paidRequest(req,success);
  await rejectReceivedResponse(received.receiptId,'bad output');await paidRequest(req,success);
  const [sum]=await sql`SELECT sum(model_cost_cny) AS amount,count(*)::int AS attempts FROM receipt_attempts WHERE receipt_id=${received.receiptId}`;
  assert.equal(sum!.amount,2);assert.equal(sum!.attempts,2);
});

test('historic usage counts across request-count resets and unknown historic usage freezes',async()=>{
  const old={...request('legacy'),requestSummary:{userChars:1,maxTokens:1}};await paidRequest(old,async()=>({response:{},usage:{prompt_tokens:8,completion_tokens:0,total_tokens:8}}));
  await sql`INSERT INTO budgets(service,per_minute,per_hour,per_day,usage_reset_at) VALUES(${service},100,100,100,now()) ON CONFLICT(service) DO UPDATE SET usage_reset_at=now()`;
  await enable();await assert.rejects(paidRequest(request('blocked-by-history'),success),BudgetExceededError);
  await sql`UPDATE receipt_attempts SET usage=NULL WHERE receipt_id=${(await attempt(old)).receipt_id}`;
  await enable(100,100);await assert.rejects(paidRequest(request('unknown-history'),success),BudgetExceededError);
});

test('serialized UTF-8 bounds include the system prompt without changing the old identity',async()=>{
  const opts={model:'qwen3.8-max',purpose:'test',promptVersion:'p',system:'中文'.repeat(500),user:'u',maxTokens:700};
  const {receiptRequest,maxTokens}=chatJsonRequestIdentity(opts);
  const summary=receiptRequest.requestSummary;
  assert.equal(summary.systemBytes,Buffer.byteLength(opts.system));
  assert.ok(Number(summary.inputTokenBound)>Buffer.byteLength(JSON.stringify([{role:'system',content:opts.system},{role:'user',content:'u'}])));
  assert.equal(maxTokens,700);
  assert.equal(logicalKeyFor(receiptRequest),logicalKeyFor({...receiptRequest,requestSummary:{},modelBudget:undefined} as ReceiptRequest));
});

test('vision and unbounded reasoning cannot buy a new call under the money policy',async()=>{
  await enable();const provider=await stub(()=>({choices:[{message:{content:'{"ok":true}'}}]}));
  process.env.DASHSCOPE_BASE_URL=provider.url;process.env.DASHSCOPE_API_KEY='test';
  try {
    await assert.rejects(chatJson({model:'qwen3-vl-flash',purpose:'test',subject:prefix+'-vision',promptVersion:'p',system:'s',user:[{type:'image_url',image_url:{url:'https://example.invalid/x.png'}}],schema:z.object({ok:z.boolean()})}),BudgetExceededError);
    assert.equal(provider.hits(),0);
  } finally {await provider.close();}
});

test('the Beijing day rolls over while the preceding day still occupies the rolling window, read-only',async()=>{
  await enable();const req=request('midnight');await paidRequest(req,success);
  await sql`UPDATE receipt_attempts SET started_at='2000-01-01T15:55:00Z' WHERE receipt_id=${(await attempt(req)).receipt_id}`;
  const before=await attempt(req);
  const overview=await modelCostOverview(new Date('2000-01-01T16:05:00Z'));
  assert.equal(overview.day.totalCny,0);assert.equal(overview.rolling.totalCny,1);
  assert.equal(overview.day.startsAt,'2000-01-01T16:00:00.000Z');
  assert.deepEqual(await attempt(req),before);
});

test('historic confirmed 429 is free only when there is no trusted charged usage',async()=>{
  const req={...request('old429'),requestSummary:{}};
  await assert.rejects(paidRequest(req,async()=>{throw new ProviderRejectedError('HTTP 429: BudgetLimitExceeded',429,true);}));
  // Recreate pre-migration ledger columns without inventing usage or a zero charge.
  await sql`UPDATE receipt_attempts SET model_cost_cny=NULL,model_cost_state=NULL WHERE receipt_id=${(await attempt(req)).receipt_id}`;
  await enable();assert.equal((await modelCostOverview()).rolling.totalCny,0);
  await sql`UPDATE receipt_attempts SET usage='{"prompt_tokens":8,"completion_tokens":0,"total_tokens":8}'::jsonb WHERE receipt_id=${(await attempt(req)).receipt_id}`;
  assert.equal((await modelCostOverview()).rolling.totalCny,8);
});

test('metadata bounds the max_tokens value actually sent when model extras override it',async()=>{
  const oldModel=process.env.LLM_MODEL,oldExtra=process.env.LLM_EXTRA_JSON;
  process.env.LLM_MODEL='qwen3.8-max';process.env.LLM_EXTRA_JSON='{"enable_thinking":false,"max_tokens":4000}';
  try {
    const normalized=chatJsonRequestIdentity({model:'default',purpose:'test',promptVersion:'p',system:'s',user:'u',maxTokens:700});
    assert.equal(normalized.receiptRequest.modelBudget.maxOutputTokens,4000);
    assert.equal(normalized.receiptRequest.requestSummary.maxTokens,4000);
    process.env.LLM_EXTRA_JSON='{"enable_thinking":true}';
    assert.equal(chatJsonRequestIdentity({model:'default',purpose:'test',promptVersion:'p',system:'s',user:'u'}).receiptRequest.modelBudget.bounded,false);
  } finally {
    if(oldModel===undefined)delete process.env.LLM_MODEL;else process.env.LLM_MODEL=oldModel;
    if(oldExtra===undefined)delete process.env.LLM_EXTRA_JSON;else process.env.LLM_EXTRA_JSON=oldExtra;
  }
});

test('embedding batches reserve actual serialized text and settle input-only usage',async()=>{
  const provider=await stub((_hit,req)=>({data:JSON.parse(req.body).input.map((_t:string,index:number)=>({index,embedding:[1,0]})),usage:{prompt_tokens:4,total_tokens:4}}));
  const [previous]=await sql`SELECT * FROM service_prices WHERE service='dashscope' AND model='text-embedding-v4'`;
  await sql`INSERT INTO service_prices(service,model,currency,input_per_mtok,output_per_mtok,source_url,verified_on)
    VALUES('dashscope','text-embedding-v4','CNY',.5,NULL,'https://example.invalid/verified',current_date)
    ON CONFLICT(service,model) DO UPDATE SET currency='CNY',input_per_mtok=.5,output_per_mtok=NULL,verified_on=current_date`;
  process.env.DASHSCOPE_BASE_URL=provider.url;process.env.DASHSCOPE_API_KEY='test';
  await enable();
  try {
    const id=prefix+'-vector';await ensureEmbeddings('article',[{id,text:'中文😀'}]);
    const row=(await sql`SELECT a.* FROM receipt_attempts a JOIN receipts r ON r.id=a.receipt_id WHERE r.subject=${'article:'+id}`)[0]!;
    assert.ok(row.model_cost_reserved_cny>0);assert.equal(row.model_cost_cny,.000002);assert.equal(row.model_cost_state,'estimated');
    assert.ok(row.model_cost_bounds.inputTokens>=Buffer.byteLength(JSON.stringify(['中文😀'])));
    assert.equal(provider.hits(),1);
  } finally {
    await sql`DELETE FROM receipts WHERE subject=${'article:'+prefix+'-vector'}`;
    await sql`DELETE FROM embeddings WHERE ref_id=${prefix+'-vector'}`;
    await sql`DELETE FROM service_prices WHERE service='dashscope' AND model='text-embedding-v4'`;
    if(previous)await sql`INSERT INTO service_prices ${sql(previous)}`;
    await provider.close();
  }
});

test('a provider actual bill remains distinct from the directory budget estimate',async()=>{
  await enable();const req=request('actual-bill');
  const received=await paidRequest(req,async()=>({...await success(),cost:{amount:.75,currency:'USD',basis:'actual'}}));
  const row=await attempt(req);
  assert.equal(row.model_cost_cny,1);assert.equal(row.model_cost_state,'estimated');
  assert.equal(row.cost,.75);assert.equal(row.currency,'USD');assert.equal(row.cost_basis,'actual');
  const [receipt]=await sql`SELECT cost,currency,cost_basis FROM receipts WHERE id=${received.receiptId}`;
  assert.deepEqual(receipt,{cost:.75,currency:'USD',cost_basis:'actual'});
});

test('legacy conservative fallback requires an explicitly reliable bound',async()=>{
  const req={...request('legacy-bound'),requestSummary:{inputTokenBound:1,maxTokens:1,modelBudgetBounded:true}};
  await paidRequest(req,async()=>({response:{},usage:null}));
  await enable();assert.equal((await modelCostOverview()).rolling.totalCny,2);
  await sql`UPDATE receipts SET request='{"inputTokenBound":1,"maxTokens":1,"modelBudgetBounded":false}'::jsonb WHERE id=${(await attempt(req)).receipt_id}`;
  const overview=await modelCostOverview();assert.equal(overview.rolling.unpricedAttempts,1);assert.equal(overview.blocked,true);
});

test('a custom model with unspecified thinking has no reliable monetary output bound',()=>{
  const oldModel=process.env.LLM_MODEL,oldExtra=process.env.LLM_EXTRA_JSON;
  process.env.LLM_MODEL='custom-reasoning';delete process.env.LLM_EXTRA_JSON;
  try {
    assert.equal(chatJsonRequestIdentity({model:'default',purpose:'test',promptVersion:'p',system:'s',user:'u'}).receiptRequest.modelBudget.bounded,false);
  } finally {
    if(oldModel===undefined)delete process.env.LLM_MODEL;else process.env.LLM_MODEL=oldModel;
    if(oldExtra===undefined)delete process.env.LLM_EXTRA_JSON;else process.env.LLM_EXTRA_JSON=oldExtra;
  }
});

test('a trustworthy actual CNY charge above reservation cannot release money at a lower catalog estimate',async()=>{
  await enable(4,4);const req=request('actual-overrun');
  await paidRequest(req,async()=>({...await success(),cost:{amount:3,currency:'CNY',basis:'actual'}}));
  const row=await attempt(req);assert.equal(row.model_cost_cny,3);assert.equal(row.model_cost_state,'retained');
  await assert.rejects(paidRequest(request('after-actual-overrun'),success),BudgetExceededError);
});

for(const [name,extra] of [
  ['enable_thinking takes priority over thinking disabled',{enable_thinking:true,thinking:{type:'disabled'}}],
  ['thinking enabled takes priority over enable_thinking false',{enable_thinking:false,thinking:{type:'enabled'}}],
] as const) {
  test(`conflicting thinking configuration is unbounded: ${name}`,()=>{
    const oldModel=process.env.LLM_MODEL,oldExtra=process.env.LLM_EXTRA_JSON;
    process.env.LLM_MODEL='conflicting-thinking';process.env.LLM_EXTRA_JSON=JSON.stringify(extra);
    try {
      assert.equal(chatJsonRequestIdentity({model:'default',purpose:'test',promptVersion:'p',system:'s',user:'u'}).receiptRequest.modelBudget.bounded,false);
    } finally {
      if(oldModel===undefined)delete process.env.LLM_MODEL;else process.env.LLM_MODEL=oldModel;
      if(oldExtra===undefined)delete process.env.LLM_EXTRA_JSON;else process.env.LLM_EXTRA_JSON=oldExtra;
    }
  });

  test(`the money policy refuses conflicting thinking before sending: ${name}`,async()=>{
    const provider=await stub(()=>({choices:[{message:{content:'{"ok":true}'}}],usage:{prompt_tokens:1,completion_tokens:0,total_tokens:1}}));
    const previous=Object.fromEntries(['LLM_MODEL','LLM_EXTRA_JSON','LLM_BASE_URL','LLM_API_KEY'].map(key=>[key,process.env[key]]));
    const model=prefix+'-conflicting-thinking';
    process.env.LLM_MODEL=model;process.env.LLM_EXTRA_JSON=JSON.stringify(extra);process.env.LLM_BASE_URL=provider.url;process.env.LLM_API_KEY='test';
    await sql`INSERT INTO service_prices(service,model,currency,input_per_mtok,output_per_mtok,source_url,verified_on)
      VALUES('llm',${model},'CNY',2,8,'https://example.invalid/verified',current_date)`;
    await enable();
    try {
      await assert.rejects(chatJson({model:'default',purpose:'test',subject:prefix+'-conflicting-thinking',promptVersion:'p',system:'s',user:name,schema:z.object({ok:z.boolean()})}),BudgetExceededError);
      assert.equal(provider.hits(),0);
    } finally {
      await sql`DELETE FROM service_prices WHERE service='llm' AND model=${model}`;
      for(const [key,value] of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;
      await provider.close();
    }
  });
}

function requestWithExtra(extra: Record<string,unknown>) {
  const oldModel=process.env.LLM_MODEL,oldExtra=process.env.LLM_EXTRA_JSON;
  process.env.LLM_MODEL='extra-bound-test';process.env.LLM_EXTRA_JSON=JSON.stringify(extra);
  try {return chatJsonRequestIdentity({model:'default',purpose:'test',promptVersion:'p',system:'s',user:'u'}).receiptRequest;}
  finally {
    if(oldModel===undefined)delete process.env.LLM_MODEL;else process.env.LLM_MODEL=oldModel;
    if(oldExtra===undefined)delete process.env.LLM_EXTRA_JSON;else process.env.LLM_EXTRA_JSON=oldExtra;
  }
}

for(const [name,value] of [['null',null],['false',false],['numeric string','1000'],['zero',0]] as const) {
  test(`actual max_tokens must be a positive integer number: ${name}`,()=>{
    assert.equal(requestWithExtra({enable_thinking:false,max_tokens:value}).modelBudget.bounded,false);
  });
}

for(const [name,extra] of [
  ['large JSON schema',{response_format:{type:'json_schema',json_schema:{description:'描述'.repeat(60000)}}}],
  ['unknown input parameter',{unproven_context:'材料'.repeat(60000)}],
  ['unexpected json_object instruction',{response_format:{type:'json_object',description:'材料'.repeat(60000)}}],
  ['unknown thinking field',{thinking:{type:'disabled',instructions:'材料'.repeat(60000)}}],
  ['nonstring thinking type',{thinking:{type:['disabled']}}],
  ['malformed thinking switch',{enable_thinking:'false'}],
] as const) {
  test(`model extras without proven input bounds are refused: ${name}`,()=>{
    assert.equal(requestWithExtra({enable_thinking:false,...extra}).modelBudget.bounded,false);
  });
}

test('proven extra controls preserve the exact logical request identity',()=>{
  const extra={enable_thinking:false,thinking:{type:'disabled'},max_tokens:1000,temperature:.2,top_p:.9,response_format:{type:'json_object'},n:1};
  const req=requestWithExtra(extra);assert.equal(req.modelBudget.bounded,true);assert.equal(req.modelBudget.maxOutputTokens,1000);
  assert.equal(logicalKeyFor(req),logicalKeyFor({service:'llm',model:'extra-bound-test',purpose:'test',identity:{model:'extra-bound-test',promptVersion:'p',system:sha256('s'),user:sha256('u'),temperature:.2,maxTokens:1500,extra}}));
});

test('the money policy blocks invalid output and unproven extra input without provider traffic',async()=>{
  const provider=await stub(()=>({choices:[{message:{content:'{"ok":true}'}}],usage:{prompt_tokens:1,completion_tokens:0,total_tokens:1}}));
  const previous=Object.fromEntries(['LLM_MODEL','LLM_EXTRA_JSON','LLM_BASE_URL','LLM_API_KEY'].map(key=>[key,process.env[key]]));
  const model=prefix+'-invalid-extra';process.env.LLM_MODEL=model;process.env.LLM_BASE_URL=provider.url;process.env.LLM_API_KEY='test';
  await sql`INSERT INTO service_prices(service,model,currency,input_per_mtok,output_per_mtok,source_url,verified_on)
    VALUES('llm',${model},'CNY',2,8,'https://example.invalid/verified',current_date)`;
  await enable();
  try {
    for(const [i,extra] of [{max_tokens:null},{max_tokens:false},{max_tokens:'1000'},{max_tokens:0},
      {response_format:{type:'json_schema',json_schema:{description:'材料'.repeat(60000)}}},{unproven_context:'材料'.repeat(60000)}].entries()) {
      process.env.LLM_EXTRA_JSON=JSON.stringify({enable_thinking:false,...extra});
      await assert.rejects(chatJson({model:'default',purpose:'test',subject:prefix+'-invalid-extra',promptVersion:'p',system:'s',user:String(i),schema:z.object({ok:z.boolean()})}),BudgetExceededError);
    }
    assert.equal(provider.hits(),0);
  } finally {
    await sql`DELETE FROM service_prices WHERE service='llm' AND model=${model}`;
    for(const [key,value] of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;
    await provider.close();
  }
});

for(const [name,usage] of [
  ['input/output disagreement',{prompt_tokens:1,input_tokens:100,completion_tokens:0,output_tokens:100,total_tokens:1}],
  ['cached alias disagreement',{prompt_tokens:1,completion_tokens:0,total_tokens:1,prompt_tokens_details:{cached_tokens:1},prompt_cache_hit_tokens:0,cached_tokens:1}],
  ['invalid input alias',{prompt_tokens:1,input_tokens:'1',completion_tokens:0,total_tokens:1}],
  ['invalid output alias',{prompt_tokens:1,completion_tokens:0,output_tokens:-1,total_tokens:1}],
  ['invalid cached alias',{prompt_tokens:1,completion_tokens:0,total_tokens:1,prompt_tokens_details:{cached_tokens:1},cached_tokens:'1'}],
] as const) {
  test(`all usage aliases must agree and contain integers: ${name}`,async()=>{
    await enable();const req=request('usage-alias');await paidRequest(req,async()=>({response:{},usage}));
    const row=await attempt(req);assert.equal(row.model_cost_cny,2);assert.equal(row.model_cost_state,'retained');
  });
}

test('one overview reuses prices for legacy attempts and the next overview reads prices afresh',async()=>{
  const [receipt]=await sql<{id:number}[]>`INSERT INTO receipts(logical_key,service,model,purpose,subject,status,request,attempts)
    VALUES(${prefix+'-many-legacy'},${service},'bounded','money-test',${prefix+'-many-legacy'},'received','{}'::jsonb,25) RETURNING id`;
  const rows=Array.from({length:25},(_,i)=>({receipt_id:receipt!.id,attempt:i+1,service,model:'bounded',status:'received',usage:{prompt_tokens:1,completion_tokens:0,total_tokens:1}}));
  await sql`INSERT INTO receipt_attempts ${sql(rows)}`;
  let priceReads=0;
  const observed=new Proxy(sql,{apply(target,thisArg,args) {
    if(Array.isArray(args[0])&&args[0].join('').includes('FROM service_prices'))priceReads++;
    return Reflect.apply(target,thisArg,args);
  }});
  const first=await modelCostOverview(undefined,observed);assert.equal(first.rolling.totalCny,25);assert.equal(priceReads,1);
  await sql`UPDATE service_prices SET input_per_mtok=2000000 WHERE service=${service}`;
  try {
    priceReads=0;const second=await modelCostOverview(undefined,observed);
    assert.equal(second.rolling.totalCny,50);assert.equal(priceReads,1);
  } finally {await sql`UPDATE service_prices SET input_per_mtok=1000000 WHERE service=${service}`;}
});

test('consistent input output and cache aliases still settle trusted usage',async()=>{
  await enable();const req=request('valid-usage-aliases');
  await paidRequest(req,async()=>({response:{},usage:{prompt_tokens:1,input_tokens:1,completion_tokens:0,output_tokens:0,total_tokens:1,
    prompt_tokens_details:{cached_tokens:1},input_tokens_details:{cached_tokens:1},prompt_cache_hit_tokens:1,cached_tokens:1,prompt_cache_miss_tokens:0}}));
  const row=await attempt(req);assert.equal(row.model_cost_cny,.1);assert.equal(row.model_cost_state,'estimated');
});
