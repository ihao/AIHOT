import {stub,tag,Reply} from './setup.ts';
import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {z} from 'zod';
import {sql,closeDb} from '../packages/backend/src/db.ts';
import {chatJson, MODELS} from '../packages/backend/src/providers/llm.ts';
import {ensureEmbeddings} from '../packages/backend/src/providers/embeddings.ts';
import {BudgetExceededError,ProviderRejectedError} from '../packages/backend/src/providers/receipts.ts';
import {providerCapacityKey,ProviderBudgetExceededError} from '../packages/backend/src/providers/provider-capacity.ts';
after(closeDb);
const schema=z.object({ok:z.boolean()});
const answer={choices:[{message:{content:'{"ok":true}'}}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}};
test('a provider budget stop releases the known free refusal and blocks fresh chat/embedding attempts while exact success remains reusable',async()=>{
  let healthy=true;
  const provider=await stub(()=>healthy?answer:new Reply(429,{code:'BudgetLimitExceeded',message:'The monthly budget has been reached.'}));
  const prefix=`provider-budget-${tag()}`,base=`${provider.url}/v1`,apiKey='local-provider-budget-test';
  const savedBase=process.env.DASHSCOPE_BASE_URL,savedKey=process.env.DASHSCOPE_API_KEY;
  process.env.DASHSCOPE_BASE_URL=base;process.env.DASHSCOPE_API_KEY=apiKey;
  const capacity=providerCapacityKey(base,apiKey);
  const ask=(suffix:string,model='qwen3.8-flash')=>chatJson({model,purpose:'provider_capacity_test',subject:`${prefix}-${suffix}`,promptVersion:'test',system:'s',user:`${prefix}-${suffix}`,schema});
  try{
    const cached=await ask('cached');healthy=false;
    await assert.rejects(ask('budget'),ProviderBudgetExceededError);
    const [rejected]=await sql`SELECT r.status,a.model_cost_cny FROM receipts r JOIN receipt_attempts a ON a.receipt_id=r.id WHERE r.subject=${prefix+'-budget'}`;
    assert.equal(rejected!.status,'failed');assert.equal(rejected!.model_cost_cny,0,'a known 429 refusal is free');
    const hits=provider.hits();
    await assert.rejects(ask('blocked','qwen3.8-max'),BudgetExceededError);
    await assert.rejects(ensureEmbeddings([{id:prefix,text:'Current article'}]),BudgetExceededError);
    assert.equal(provider.hits(),hits,'same endpoint/key pauses all fresh model traffic');
    assert.equal((await sql`SELECT 1 FROM receipts WHERE subject=${prefix+'-blocked'}`).length,0,'preflight waits create no attempted call');
    const reuse=await ask('cached');assert.equal(reuse.receiptId,cached.receiptId);assert.equal(reuse.reused,true);
    assert.equal(provider.hits(),hits,'a budget stop cannot discard a successful answer');
    await sql`UPDATE settings SET value=value||jsonb_build_object('until',clock_timestamp()-interval '1 second') WHERE key=${capacity}`;
    healthy=true;await ask('probe','qwen3.8-max');
    assert.equal((await sql`SELECT 1 FROM settings WHERE key=${capacity}`).length,0,'a successful admitted probe restores normal work');
  }finally{
    await sql`DELETE FROM settings WHERE key=${capacity}`;await sql`DELETE FROM receipts WHERE subject LIKE ${prefix+'%'}`;
    if(savedBase===undefined)delete process.env.DASHSCOPE_BASE_URL;else process.env.DASHSCOPE_BASE_URL=savedBase;
    if(savedKey===undefined)delete process.env.DASHSCOPE_API_KEY;else process.env.DASHSCOPE_API_KEY=savedKey;
    await provider.close();
  }
});
test('an ordinary 429 rate limit keeps its existing retry semantics and cannot stop the whole credential',async()=>{
  const provider=await stub(hit=>hit===1?new Reply(429,{code:'Throttling.RateQuota'}):answer);
  const prefix=`provider-rate-${tag()}`,base=`${provider.url}/v1`,apiKey='local-provider-rate-test';
  const savedBase=process.env.DASHSCOPE_BASE_URL,savedKey=process.env.DASHSCOPE_API_KEY;
  process.env.DASHSCOPE_BASE_URL=base;process.env.DASHSCOPE_API_KEY=apiKey;
  const capacity=providerCapacityKey(base,apiKey),ask=()=>chatJson({model:'qwen3.8-flash',purpose:'provider_capacity_test',subject:prefix,promptVersion:'test',system:'s',user:prefix,schema});
  try{
    await assert.rejects(ask(),error=>error instanceof ProviderRejectedError&&error.retryable);
    assert.equal((await sql`SELECT 1 FROM settings WHERE key=${capacity}`).length,0);
    assert.equal((await ask()).data.ok,true);assert.equal(provider.hits(),2);
  }finally{
    await sql`DELETE FROM settings WHERE key=${capacity}`;await sql`DELETE FROM receipts WHERE subject=${prefix}`;
    if(savedBase===undefined)delete process.env.DASHSCOPE_BASE_URL;else process.env.DASHSCOPE_BASE_URL=savedBase;
    if(savedKey===undefined)delete process.env.DASHSCOPE_API_KEY;else process.env.DASHSCOPE_API_KEY=savedKey;
    await provider.close();
  }
});

// An opted-in backup is a second purchase: the unknown primary keeps its reservation, and the
// backup needs its own bounded CNY admission even when the production limit is disabled for a benchmark.
for (const scope of ['production', 'verification_benchmark'] as const) {
  test(`opt-in fallback keeps unknown primary money and independently checks the ${scope} quota`, async () => {
    const prefix = `fallback-money-${tag()}`;
    const primary = await stub(() => new Reply(503, { error: 'outcome has no billing confirmation' }));
    const backup = await stub(() => answer);
    const services = [`${prefix}-primary`, `${prefix}-backup`];
    const envKeys = services.flatMap(service => [`${service}_BASE`, `${service}_KEY`]);
    const [policy] = await sql`SELECT enabled, day_limit_cny, rolling_limit_cny FROM model_cost_policy WHERE id=1`;
    try {
      for (const [index, service] of services.entries()) {
        process.env[`${service}_BASE`] = `${index === 0 ? primary.url : backup.url}/v1`;
        process.env[`${service}_KEY`] = 'local-fallback-budget-test';
        MODELS[service] = { key: service, service, model: 'bounded', baseUrlEnv: `${service}_BASE`, apiKeyEnv: `${service}_KEY`, jsonMode: true, extra: { enable_thinking: false } };
        await sql`INSERT INTO service_prices(service,model,currency,input_per_mtok,output_per_mtok) VALUES(${service},'bounded','CNY',0,0)`;
        await sql`INSERT INTO ninebtc_model_price_evidence(service,model,per_request,verified_on,source_url) VALUES(${service},'bounded',1,current_date,'https://example.invalid/operator-verified')`;
      }
      await sql`UPDATE model_cost_policy SET enabled=${scope === 'production'},day_limit_cny=1.5,rolling_limit_cny=1.5 WHERE id=1`;
      const opts = { model: services[0]!, fallbackModel: services[1]!, purpose: scope === 'production' ? 'provider_capacity_test' : scope,
        subject: prefix, promptVersion: 'test', system: 's', user: prefix, schema };
      await assert.rejects(chatJson(opts), BudgetExceededError);
      assert.equal(primary.hits(), 1);
      assert.equal(backup.hits(), 0, 'backup quota is checked before sending or recording an attempt');
      const [original] = await sql`SELECT r.id,r.status,r.request,a.model_cost_reserved_cny,a.model_cost_cny,a.model_cost_state FROM receipts r JOIN receipt_attempts a ON a.receipt_id=r.id WHERE r.subject=${prefix}`;
      assert.equal(original!.status, 'unknown');
      assert.equal(original!.model_cost_reserved_cny, 1);
      assert.equal(original!.model_cost_cny, 1);
      assert.equal(original!.model_cost_state, 'reserved');
      assert.equal(original!.request.fallbackReceiptId, undefined, 'a blocked backup cannot hide the unknown primary');
      assert.equal((await sql`SELECT 1 FROM receipt_attempts WHERE service=${services[1]!}`).length, 0);

      await sql`UPDATE model_cost_policy SET day_limit_cny=3,rolling_limit_cny=3 WHERE id=1`;
      const result = await chatJson(opts);
      assert.equal(result.model, services[1]);
      assert.equal(primary.hits(), 1, 'recovery never resends the unknown primary');
      assert.equal(backup.hits(), 1);
      const rows = await sql`SELECT r.id,r.service,r.status,r.request,a.model_cost_reserved_cny,a.model_cost_cny,a.model_cost_state FROM receipts r JOIN receipt_attempts a ON a.receipt_id=r.id WHERE r.subject=${prefix} ORDER BY r.id`;
      assert.equal(rows.length, 2);
      assert.equal(rows[0]!.status, 'unknown');
      assert.equal(rows[0]!.model_cost_cny, 1, 'a successful backup cannot release primary money');
      assert.equal(rows[0]!.request.fallbackReceiptId, result.receiptId);
      assert.equal(rows[1]!.model_cost_reserved_cny, 1);
      assert.equal(rows[1]!.model_cost_cny, 1);
      assert.equal(rows[1]!.model_cost_state, 'estimated');
      assert.equal((await chatJson(opts)).reused, true);
      assert.deepEqual([primary.hits(), backup.hits()], [1, 1]);
    } finally {
      await sql`UPDATE model_cost_policy SET enabled=${policy!.enabled},day_limit_cny=${policy!.day_limit_cny},rolling_limit_cny=${policy!.rolling_limit_cny} WHERE id=1`;
      await sql`DELETE FROM receipts WHERE subject=${prefix}`;
      await sql`DELETE FROM service_prices WHERE service IN ${sql(services)}`;
      await sql`DELETE FROM ninebtc_model_price_evidence WHERE service IN ${sql(services)}`;
      await sql`DELETE FROM settings WHERE key IN ${sql(services.map(service => `model.circuit.${service}`))}`;
      for (const service of services) delete MODELS[service];
      for (const key of envKeys) delete process.env[key];
      await Promise.all([primary.close(), backup.close()]);
    }
  });
}
