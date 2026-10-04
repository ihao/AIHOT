import { tag } from './setup.ts';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { sql, closeDb } from '../packages/backend/src/db.ts';
import { BudgetExceededError, lockModelCost } from '../packages/backend/src/providers/model-cost.ts';
import * as capacity from '../packages/backend/src/providers/provider-capacity.ts';

const feature=()=>capacity;
const prefix=tag(),secret=`local-secret-${prefix}`,endpoint='https://provider.invalid/v1';
const keys=new Set<string>();
function key(suffix='main') {const k=feature().providerCapacityKey(endpoint,`${secret}-${suffix}`);keys.add(k);return k;}
beforeEach(async()=>{for(const k of keys)await sql`DELETE FROM settings WHERE key=${k}`;});
after(async()=>{for(const k of keys)await sql`DELETE FROM settings WHERE key=${k}`;await closeDb();});
const check=(k:string,service='dashscope')=>sql.begin(async tx=>{await lockModelCost(tx);await feature().checkProviderCapacity(tx,k,service);});
async function row(k:string){return (await sql`SELECT * FROM settings WHERE key=${k}`)[0];}
async function expire(k:string){await sql`UPDATE settings SET value=value||jsonb_build_object('until',clock_timestamp()-interval '2 seconds') WHERE key=${k}`;}

test('provider budget errors clearly distinguish HTTP rejection from a preflight wait',()=>{
  const E=feature().ProviderBudgetExceededError;
  for(const actual of [false,true]){
    const error=new E('dashscope',actual);
    assert.ok(error instanceof BudgetExceededError);
    assert.equal(error.service,'dashscope');assert.equal(error.retryAfterSeconds,3600);
    assert.equal(error.reason,'provider_budget');assert.equal(error.window,'provider_budget');
    assert.equal(error.actualHttpRejection,actual);
    assert.match(error.message,/供应商.*(?:停|暂停).*服务/);assert.match(error.message,/不是文章失败/);
  }
  assert.equal(new E('dashscope').actualHttpRejection,false);
});

test('capacity identity shares endpoint and credential across models without exposing either',()=>{
  const e=feature(),k=e.providerCapacityKey(endpoint,secret);
  assert.match(k,/^provider\.capacity\.[a-f0-9]{64}$/);
  assert.equal(k,e.providerCapacityKey(endpoint+'/',secret));
  assert.equal(k,e.providerCapacityKey('https://PROVIDER.invalid:443/v1',secret));
  const models=['qwen3.8-flash','qwen3.8-max','deepseek-v4.1-flash'];
  assert.deepEqual(models.map(()=>e.providerCapacityKey(endpoint,secret)),models.map(()=>k));
  assert.notEqual(k,e.providerCapacityKey(endpoint,secret+'other'));
  assert.notEqual(k,e.providerCapacityKey('https://other.invalid/v1',secret));
  assert.ok(!k.includes(secret));assert.ok(!k.includes('provider.invalid'));
});

test('an unset capacity key does not block normal calls or create a setting',async()=>{
  const k=key();await check(k);assert.equal(await row(k),undefined);
});

test('a confirmed provider budget stop blocks new work before HTTP or attempt creation',async()=>{
  const k=key();await feature().recordProviderBudgetStop(k,'dashscope');
  const before=await sql`SELECT count(*)::int AS n FROM receipt_attempts`;
  let sends=0;
  await assert.rejects(sql.begin(async tx=>{await lockModelCost(tx);await feature().checkProviderCapacity(tx,k,'llm');sends++;}),error=>{
    assert.ok(error instanceof feature().ProviderBudgetExceededError);assert.equal(error.actualHttpRejection,false);return true;
  });
  assert.equal(sends,0);assert.deepEqual(await sql`SELECT count(*)::int AS n FROM receipt_attempts`,before);
  const state=await row(k);assert.equal(state.value.state,'blocked');assert.equal(state.value.version,1);
  const serialized=JSON.stringify(state);
  assert.ok(!serialized.includes(secret));assert.ok(!serialized.includes(endpoint));
  const [time]=await sql`SELECT extract(epoch FROM (value->>'until')::timestamptz-clock_timestamp()) AS remaining FROM settings WHERE key=${k}`;
  assert.ok(Number(time.remaining)>3590&&Number(time.remaining)<=3600);
});

test('capacity expiry uses the database clock despite a wrong application clock',async()=>{
  const k=key();await feature().recordProviderBudgetStop(k,'dashscope');
  const old=Date.now;Date.now=()=>9_000_000_000_000;
  try{await assert.rejects(check(k),feature().ProviderBudgetExceededError);}finally{Date.now=old;}
  assert.equal((await row(k)).value.state,'blocked');
});

test('an expired stop permits exactly one concurrent minute probe across services',async()=>{
  const k=key();await feature().recordProviderBudgetStop(k,'dashscope');await expire(k);
  let sends=0;
  // Exercise the row lock itself; the production caller also holds the global model lock.
  const results=await Promise.allSettled(Array.from({length:12},(_,i)=>sql.begin(async tx=>{
    await feature().checkProviderCapacity(tx,k,i%2?'llm':'dashscope');sends++;
  })));
  assert.equal(sends,1);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  for(const r of results)if(r.status==='rejected')assert.ok(r.reason instanceof feature().ProviderBudgetExceededError);
  const state=await row(k);assert.equal(state.value.state,'probe');
  const [time]=await sql`SELECT extract(epoch FROM (value->>'until')::timestamptz-clock_timestamp()) AS remaining FROM settings WHERE key=${k}`;
  assert.ok(Number(time.remaining)>45&&Number(time.remaining)<=60);
});

test('probe expiry permits one new probe and a confirmed 429 refreshes the hour stop',async()=>{
  const k=key();await feature().recordProviderBudgetStop(k,'dashscope');await expire(k);
  await check(k);await assert.rejects(check(k),feature().ProviderBudgetExceededError);
  await expire(k);await check(k,'llm');assert.equal((await row(k)).value.state,'probe');
  await feature().recordProviderBudgetStop(k,'dashscope');assert.equal((await row(k)).value.state,'blocked');
  await assert.rejects(check(k),feature().ProviderBudgetExceededError);
  const [time]=await sql`SELECT extract(epoch FROM (value->>'until')::timestamptz-clock_timestamp()) AS remaining FROM settings WHERE key=${k}`;
  assert.ok(Number(time.remaining)>3590);
});

test('a normal success cannot clear a budget stop, including a stop that replaced a probe',async()=>{
  const k=key();await feature().recordProviderBudgetStop(k,'dashscope');
  const blocked=await row(k);await feature().clearProviderProbe(k);assert.deepEqual(await row(k),blocked);
  await expire(k);await check(k);await feature().recordProviderBudgetStop(k,'dashscope');
  const renewed=await row(k);await feature().clearProviderProbe(k);assert.deepEqual(await row(k),renewed);
});

test('successful probes clear only probe state and missing cleanup remains harmless',async()=>{
  const k=key();await feature().recordProviderBudgetStop(k,'dashscope');await expire(k);await check(k);
  assert.equal((await row(k)).value.state,'probe');await feature().clearProviderProbe(k);
  assert.equal(await row(k),undefined);await feature().clearProviderProbe(k);await check(k);
});

test('cleanup cannot turn corrupt probe metadata into an unset and allowed capacity',async()=>{
  const k=key();await sql`INSERT INTO settings(key,value) VALUES(${k},'{"version":2,"state":"probe"}')`;
  const before=await row(k);await feature().clearProviderProbe(k);
  assert.deepEqual(await row(k),before);
  await assert.rejects(check(k),feature().ProviderBudgetExceededError);
});

for(const value of [null,[],{}, {version:1,state:'unknown',until:'2026-10-04T00:00:00Z',service:'dashscope'},
  {version:1,state:'blocked',until:'invalid',service:'dashscope'}, {version:2,state:'probe',until:'2026-10-04T00:00:00Z',service:'dashscope'},
  {version:1,state:'blocked',until:'2026-02-30T00:00:00Z',service:'dashscope'},
  {version:1,state:'blocked',until:'2026-10-04T00:00:00Z'}]) test(`corrupt existing capacity fails closed: ${JSON.stringify(value)}`,async()=>{
  const k=key();await sql`INSERT INTO settings(key,value) VALUES(${k},${JSON.stringify(value)}::jsonb)`;
  const before=await row(k);
  await assert.rejects(check(k),feature().ProviderBudgetExceededError);
  assert.deepEqual(await row(k),before,'corrupt state must not silently reset capacity');
});
