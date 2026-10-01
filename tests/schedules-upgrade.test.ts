import { tag } from './setup.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PgBoss } from 'pg-boss';
import { config } from '../packages/backend/src/config.ts';
import { closeDb } from '../packages/backend/src/db.ts';

test('schedule registration upgrades mutable options while preserving existing cron policy and jobs', async () => {
  const oldMode = config.editorialMode;
  const oldCollect = process.env.COLLECT_ENABLED;
  config.editorialMode = 'automatic';
  process.env.COLLECT_ENABLED = 'false';
  const boss = new PgBoss({ connectionString: config.databaseUrl, schema: `schedule_upgrade_${tag()}`,
    max: 2, schedule: false, supervise: false });
  boss.on('error', error => { throw error; });
  try {
    await boss.start();
    const legacy = 'cron.content.sweep';
    await boss.createQueue(legacy, { policy: 'standard', retryLimit: 7, expireInSeconds: 120 });
    const job = await boss.send(legacy, { syntheticUpgradeProbe: true });
    assert.ok(job);
    const { registerSchedules, SCHEDULES } = await import('../apps/worker/src/schedules.ts');
    const registered: string[] = [];
    // Only worker pickup is stubbed: queue creation/update and cron persistence use real PostgreSQL.
    const registrationBoss = {
      getQueue: boss.getQueue.bind(boss), createQueue: boss.createQueue.bind(boss),
      updateQueue: boss.updateQueue.bind(boss), schedule: boss.schedule.bind(boss),
      getSchedules: boss.getSchedules.bind(boss), unschedule: boss.unschedule.bind(boss),
      work: async (name: string) => { registered.push(name); },
    } as unknown as PgBoss;
    await registerSchedules(registrationBoss);
    await registerSchedules(registrationBoss);
    const existing = await boss.getQueue(legacy);
    assert.equal(existing!.policy, 'standard', 'startup must preserve the policy fixed when the legacy queue was created');
    assert.equal(existing!.retryLimit, 1);
    assert.equal(existing!.expireInSeconds, 3600);
    assert.equal((await boss.getJobById(legacy, job))!.state, 'created', 'upgrade registration retains the existing queued job');
    const daily = await boss.getQueue('cron.reports.daily-automatic');
    assert.equal(daily!.policy, 'singleton', 'new queues still use the intended singleton policy');
    assert.equal(daily!.retryLimit, 1);
    assert.equal(registered.length, SCHEDULES.length * 2, 'both startup registrations reach all worker handlers');
    assert.ok((await boss.getSchedules()).some(schedule => schedule.name === 'cron.reports.daily-automatic'));
  } finally {
    await boss.stop();
    await closeDb();
    config.editorialMode = oldMode;
    if (oldCollect === undefined) delete process.env.COLLECT_ENABLED;
    else process.env.COLLECT_ENABLED = oldCollect;
  }
});
