import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

for (const name of ['evidence-materials', 'automatic-policy', 'verification-recovery']) {
  test(`${name} imports independently without database or network activity`, () => {
    const target = new URL(`../packages/backend/src/editorial/${name}.ts`, import.meta.url).href;
    const script = `
      import net from 'node:net';
      net.Socket.prototype.connect = function () { throw new Error('unexpected network during import'); };
      globalThis.fetch = async () => { throw new Error('unexpected fetch during import'); };
      await import(${JSON.stringify(target)});
      console.log('imported');
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8', timeout: 10_000,
      env: { ...process.env, AIHOT_CREDENTIALS_DIR: '/nonexistent-test-credentials',
        COLLECT_ENABLED: 'false', MODEL_CALLS_ENABLED: 'false',
        FEISHU_CONTENT_PUSH_ENABLED: 'false', INDEXNOW_SUBMIT_ENABLED: 'false' },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'imported');
  });
}
