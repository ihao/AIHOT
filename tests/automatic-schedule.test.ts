import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
const moduleUrl=new URL('../apps/worker/src/schedules.ts',import.meta.url).href;
function registration(mode:string, existing=false) {
  const code=`const {registerSchedules,SCHEDULES}=await import(${JSON.stringify(moduleUrl)});
    if (${JSON.stringify(mode)}==='automatic'&&!SCHEDULES.some(s=>s.name==='reports.daily-automatic')) throw new Error('missing automatic daily schedule');
    const scheduled=[],queues=[],removed=[],updates=[];
    const boss={getQueue:async(name)=>${JSON.stringify(existing)}&&name==='cron.content.sweep'?{policy:'standard'}:null,
      updateQueue:async(name,options)=>{if('policy' in options)throw new Error('queue policy cannot be changed after creation');updates.push({name,options});},
      createQueue:async(name,options)=>queues.push({name,options}),schedule:async(name,cron,data,options)=>scheduled.push({name,cron,options}),work:async()=>{},getSchedules:async()=>[{name:'cron.reports.daily-old'}],unschedule:async(name)=>removed.push(name)};
    await registerSchedules(boss);console.log(JSON.stringify({scheduled,queues,removed,updates}));`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,EDITORIAL_MODE:mode,AUTOMATIC_DAILY_TIME:'21:30',COLLECT_ENABLED:'false',MODEL_CALLS_ENABLED:'false',AIHOT_CREDENTIALS_DIR:'/nonexistent',AIHOT_DATA_DIR:'/nonexistent-test'},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}
test('actual registration installs Shanghai daily automatic only, missed once, bounded retries and removes obsolete cron',()=>{
  const auto=registration('automatic');const daily=auto.scheduled.find((s:any)=>s.name==='cron.reports.daily-automatic');assert.ok(daily);
  assert.equal(daily.cron,'30 21 * * *');assert.equal(daily.options.tz,'Asia/Shanghai');assert.equal(daily.options.missed,'once');
  assert.ok(auto.queues.find((s:any)=>s.name===daily.name).options.retryLimit<=2);
  assert.ok(auto.scheduled.some((s:any)=>s.name==='cron.automatic.safety'));
  assert.ok(!auto.scheduled.some((s:any)=>/reports\.(weekly|monthly)/.test(s.name)));
  assert.ok(auto.removed.includes('cron.reports.daily-old'));
  assert.ok(!registration('manual').scheduled.some((s:any)=>s.name==='cron.reports.daily-automatic'||s.name==='cron.automatic.safety'));
});
test('existing cron registration updates only mutable retry and expiry options',()=>{
  const upgraded=registration('automatic',true);
  assert.deepEqual(upgraded.updates,[{name:'cron.content.sweep',options:{retryLimit:1,expireInSeconds:3600}}]);
});
