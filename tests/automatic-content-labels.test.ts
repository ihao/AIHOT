import assert from 'node:assert/strict';
import { test } from 'node:test';
import { automaticReasonCode, automaticReasonLabel } from '../packages/contracts/src/automatic-content.ts';

test('unknown external reasons and prototype names produce safe human labels',()=>{
  for(const reason of ['constructor','toString','credential_value_should_stay_private','Error: upstream returned credential_value_should_stay_private']) {
    assert.equal(automaticReasonCode(reason),'runtime_error');
    assert.equal(typeof automaticReasonLabel(reason),'string');
    assert.equal(automaticReasonLabel(reason).includes('credential_value'),false);
  }
  assert.equal(automaticReasonCode('claim_2_primary_evidence_missing'),'claim_2_primary_evidence_missing');
  assert.match(automaticReasonLabel('claim_2_primary_evidence_missing'),/一手证据/);
});
