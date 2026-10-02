import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { config } from '../packages/backend/src/config.ts';
import { llmsTxt } from '../packages/backend/src/publication/llms.ts';
const configUrl = new URL('../packages/backend/src/config.ts', import.meta.url).href;
function read(value?: string) {
  const env: NodeJS.ProcessEnv = { ...process.env, AIHOT_CREDENTIALS_DIR: '/nonexistent', MODEL_CALLS_ENABLED: 'false', COLLECT_ENABLED: 'false' };
  delete env.AUTOMATIC_DAILY_TIME;
  if (value !== undefined) env.AUTOMATIC_DAILY_TIME = value;
  return spawnSync(process.execPath, ['--input-type=module', '-e', `const {config}=await import(${JSON.stringify(configUrl)}); console.log(config.automaticDailyTime)`], { env, encoding: 'utf8' });
}
test('daily time defaults to 21:30 and accepts strict HH:mm only', () => {
  assert.equal(read().stdout.trim(), '21:30');
  assert.equal(read('00:05').stdout.trim(), '00:05');
  for (const invalid of ['24:00', '12:60', '9:30', '21:30:00', ' 21:30', '']) assert.notEqual(read(invalid).status, 0, invalid);
});
test('Agent discovery describes the current daily mode and configured time', () => {
  const oldMode = config.editorialMode;
  const oldTime = config.automaticDailyTime;
  const availability = { hasDailies: true, hasWeekly: false, hasMonthly: false, hasLeaderboard: false };
  try {
    config.editorialMode = 'automatic';
    config.automaticDailyTime = '20:45';
    const automatic = llmsTxt(availability).split('\n').find(line => line.includes('/feed/daily.xml'))!;
    assert.match(automatic, /20:45/);
    assert.match(automatic, /自动/);
    config.editorialMode = 'manual';
    const manual = llmsTxt(availability).split('\n').find(line => line.includes('/feed/daily.xml'))!;
    assert.match(manual, /手动模式/);
    assert.doesNotMatch(manual, /20:45/);
    assert.doesNotMatch(llmsTxt({ ...availability, hasDailies: false }), /\/feed\/daily\.xml/);
  } finally {
    config.editorialMode = oldMode;
    config.automaticDailyTime = oldTime;
  }
});
