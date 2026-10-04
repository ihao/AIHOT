import assert from 'node:assert/strict';
import {test} from 'node:test';
import {automaticReasonCode,automaticReasonLabel} from '../packages/contracts/src/automatic-content.ts';
import {processingErrorLabel} from '../apps/web/app/features/admin/labels.ts';
test('cost stops are explained as unpublished evidence or input limits rather than runtime faults',()=>{
 for(const code of ['critical_core_primary_evidence_missing','verification_input_budget_exceeded','rewrite_input_budget_exceeded']) {
  assert.equal(automaticReasonCode(code),code);
  assert.match(automaticReasonLabel(code),/已停止/);
  assert.ok(!automaticReasonLabel(code).includes('处理故障'));
 }
});
test('amount exhaustion remains an automatic wait with readable monetary guidance',()=>{
 for(const reason of ['Budget for model_cost exhausted (amount_day): 北京时间当天费用已满',
   'Budget for model_cost exhausted (amount_rolling): 滚动24小时金额已满',
   'Budget for model_cost exhausted (missing_price): 价格未核对']) {
  assert.equal(automaticReasonCode(reason),'budget_wait');
  const label=processingErrorLabel(reason);
  assert.match(label,/金额|费用|价格/);
  assert.ok(!label.includes('Budget for'));
 }
 assert.equal(processingErrorLabel('HTTP 429: BudgetLimitExceeded'),'HTTP 429: BudgetLimitExceeded',
  'a provider rejection must remain distinguishable from our local spending guard');
});
