import './setup.ts';
import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {tag} from './setup.ts';
const {sql,closeDb}=await import('@aihot/backend/db');
const {modelsOverview}=await import('../packages/backend/src/admin/models.ts');
after(closeDb);

test('model overview exposes shared amount windows and prices trusted cached input separately',async()=>{
  const model=`overview-${tag()}`;
  const [receipt]=await sql`INSERT INTO receipts(service,model,purpose,logical_key,subject,request,status)
    VALUES('dashscope',${model},'verify_summary',${model},${model},'{}','received') RETURNING id`;
  await sql`INSERT INTO receipt_attempts(receipt_id,attempt,service,model,origin,status,started_at,usage)
    VALUES(${receipt!.id},1,'dashscope',${model},'live','received',now(),'{"prompt_tokens":1000,"completion_tokens":100,"prompt_tokens_details":{"cached_tokens":800}}')`;
  await sql`INSERT INTO service_prices(service,model,currency,input_per_mtok,output_per_mtok,cached_per_mtok,verified_on)
    VALUES('dashscope',${model},'CNY',12,36,1.5,current_date)`;
  try {
    const result=await modelsOverview(1);
    assert.equal(result.moneyBudget.policy.timezone,'Asia/Shanghai');
    assert.equal(result.moneyBudget.basis,'estimated');
    assert.equal(result.moneyBudget.policy.dayLimitCny,9);
    const usage=result.capabilities.find(c=>c.key==='verification')!.usage.find(u=>u.model===model)!;
    assert.equal(usage.cachedTokensIn,800);
    assert.equal(usage.estimate!.amount,0.0072);
    await sql`UPDATE receipt_attempts SET usage='{"prompt_tokens":1000,"completion_tokens":100,"prompt_tokens_details":{"cached_tokens":1001}}' WHERE receipt_id=${receipt!.id}`;
    const invalid=(await modelsOverview(1)).capabilities.find(c=>c.key==='verification')!.usage.find(u=>u.model===model)!;
    assert.equal(invalid.cachedTokensIn,0,'invalid cache counts never discount the estimate');
    assert.equal(invalid.estimate!.amount,0.0156);
    await sql`UPDATE receipt_attempts SET usage='{"prompt_tokens":1000,"completion_tokens":100,"prompt_tokens_details":{"cached_tokens":800},"prompt_cache_hit_tokens":0}' WHERE receipt_id=${receipt!.id}`;
    const conflict=(await modelsOverview(1)).capabilities.find(c=>c.key==='verification')!.usage.find(u=>u.model===model)!;
    assert.equal(conflict.cachedTokensIn,0);assert.equal(conflict.estimate!.amount,0.0156);
    await sql`UPDATE receipt_attempts SET usage='{"input_tokens":1000,"output_tokens":100,"input_tokens_details":{"cached_tokens":800}}' WHERE receipt_id=${receipt!.id}`;
    const alias=(await modelsOverview(1)).capabilities.find(c=>c.key==='verification')!.usage.find(u=>u.model===model)!;
    assert.equal(alias.cachedTokensIn,800);assert.equal(alias.estimate!.amount,0.0072);
    await sql`UPDATE receipt_attempts SET usage='{"prompt_tokens":"broken","completion_tokens":1.5}' WHERE receipt_id=${receipt!.id}`;
    const malformed=(await modelsOverview(1)).capabilities.find(c=>c.key==='verification')!.usage.find(u=>u.model===model)!;
    assert.equal(malformed.estimate,null,'malformed usage does not break the budget page or imply a numeric estimate');
  } finally {
    await sql`DELETE FROM receipt_attempts WHERE receipt_id=${receipt!.id}`;
    await sql`DELETE FROM receipts WHERE id=${receipt!.id}`;
    await sql`DELETE FROM service_prices WHERE model=${model}`;
  }
});
