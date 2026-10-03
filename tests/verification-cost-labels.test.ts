import assert from 'node:assert/strict';
import {test} from 'node:test';
import {automaticReasonCode,automaticReasonLabel} from '../packages/contracts/src/automatic-content.ts';
test('cost stops are explained as unpublished evidence or input limits rather than runtime faults',()=>{
 for(const code of ['critical_core_primary_evidence_missing','verification_input_budget_exceeded','rewrite_input_budget_exceeded']) {
  assert.equal(automaticReasonCode(code),code);
  assert.match(automaticReasonLabel(code),/已停止/);
  assert.ok(!automaticReasonLabel(code).includes('处理故障'));
 }
});
