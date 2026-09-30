import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceSafetyStreak } from '../packages/backend/src/editorial/automatic-safety.ts';
test('only five consecutive terminal explicit contradictions trigger a source pause and reset consumed streak',()=>{
  let streak=0;
  for(let i=0;i<4;i++){const next=advanceSafetyStreak(streak,'contradicted');assert.equal(next.pause,false);streak=next.streak;}
  assert.equal(streak,4);
  assert.deepEqual(advanceSafetyStreak(streak,'contradicted'),{streak:0,pause:true});
  for(const verdict of ['supported','needs_evidence',null,'budget_wait'])assert.deepEqual(advanceSafetyStreak(4,verdict),{streak:0,pause:false});
  assert.deepEqual(advanceSafetyStreak(4,'contradicted',true),{streak:0,pause:false});
});
