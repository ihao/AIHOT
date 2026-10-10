import {stub,tag,Reply} from './setup.ts';
import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {z} from 'zod';
import {sql,closeDb} from '../packages/backend/src/db.ts';
import {chatJson} from '../packages/backend/src/providers/llm.ts';
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
