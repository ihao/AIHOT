import { tag } from './setup.ts';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { sql, closeDb } from '../packages/backend/src/db.ts';
import { paidRequest, BudgetExceededError } from '../packages/backend/src/providers/receipts.ts';
import { resetBudgetUsage, listBudgets } from '../packages/backend/src/admin/settings.ts';

after(closeDb);
test('one audited reset retains paid ledger and cache, then enforces the same rolling caps', async () => {
  const service=`reset-${tag()}`;
  await sql`INSERT INTO budgets(service,per_minute,per_hour,per_day) VALUES(${service},20,300,1)`;
  let sent=0;
  const ask=(subject:string)=>paidRequest({service,purpose:'test',subject,identity:{subject}},async()=>{sent++;return {response:{ok:true},usage:{tokens:10}};});
  const first=await ask('first');
  await assert.rejects(ask('second'),BudgetExceededError);
  const reset=await resetBudgetUsage(service,'User approved one-time reset','test',service);
  assert.equal(reset.per_day,1);
  const reused=await ask('first');
  assert.equal(reused.receiptId,first.receiptId);
  assert.equal(sent,1);
  await ask('second');
  await assert.rejects(ask('third'),BudgetExceededError);
  const repeated=await resetBudgetUsage(service,'Same operation retry','test',service);
  assert.equal(new Date(repeated.usage_reset_at).toISOString(),new Date(reset.usage_reset_at).toISOString());
  await assert.rejects(ask('third'),BudgetExceededError);
  const [ledger]=await sql`SELECT count(*)::int AS n FROM receipt_attempts WHERE service=${service}`;
  const [audit]=await sql`SELECT count(*)::int AS n FROM audit_log WHERE action='budget.reset_usage' AND subject=${`budget:${service}`}`;
  assert.equal(ledger.n,2);
  assert.equal(audit.n,1);
  assert.equal((await listBudgets()).find(b=>b.service===service)?.used_day,1);
  // Aging within the new epoch restores rolling capacity without another reset.
  await sql`UPDATE receipt_attempts SET started_at=now()-interval '25 hours' WHERE service=${service}`;
  await ask('third');
  assert.equal(sent,3);
});
