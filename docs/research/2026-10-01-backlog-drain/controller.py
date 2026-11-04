import json,subprocess,time,pathlib,datetime,os
ROOT=pathlib.Path('/srv/9btc-ops/backlog-20261001')
STATE=ROOT/'state.json'
BASE=['docker','compose','--env-file','/srv/9btc/.env','-f','/srv/9btc/deploy/eu.compose.yml']
def run(cmd): return subprocess.check_output(cmd,text=True,timeout=300)
def save(data,path=STATE):
 tmp=path.with_suffix('.tmp'); tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)); os.chmod(tmp,0o600);tmp.replace(path)
def helper(mode):
 run(['docker','cp',str(ROOT/'batch.mjs'),'ninebtc-api-1:/app/backlog-batch.mjs'])
 run(['docker','cp',str(STATE),'ninebtc-api-1:/tmp/ninebtc-backlog-state.json'])
 return json.loads(run(['docker','exec','-u','0','ninebtc-api-1','node','/app/backlog-batch.mjs',mode]))
def restore(s,reason):
 s['phase']='restoring';s['restoreReason']=reason;save(s)
 while True:
  try:
   s['restoration']=helper('restore')
   run(BASE+['up','-d','--no-deps','worker'])
   s['phase']='restored';s['restoredAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();save(s)
   print(json.dumps({'phase':'restored','reason':reason,'restoration':s['restoration']},ensure_ascii=False),flush=True);return
  except Exception as e:
   print('Restoration retry: '+str(e),flush=True);time.sleep(30)
s=json.loads(STATE.read_text())
if s.get('phase')=='restored': raise SystemExit(0)
if s.get('phase')=='restoring':
 restore(s,'resume_interrupted_restoration');raise SystemExit(0)
try:
 while not (ROOT/'activate').exists():time.sleep(5)
 # The exact old budget is on disk before any provider cap is relaxed.
 if s.get('phase')!='running' or not s.get('activation'):
  s['phase']='running';save(s)
  s['activation']=helper('relax');save(s)
 transient_errors=0
 while True:
  try:
   status=helper('status');save(status,ROOT/'status.json');transient_errors=0
  except Exception as error:
   transient_errors+=1
   print('Status retry '+str(transient_errors)+': '+str(error),flush=True)
   if transient_errors>=10:raise
   time.sleep(30);continue
  remaining=sum(x['count'] for x in status['counts'] if x['processing_state'] in ('new','failed'))
  print(json.dumps({'phase':'running','remaining':remaining,'verificationWaiting':status['verificationWaiting'],'pendingJobs':status['pendingJobs'],'groupWaiting':status['groupWaiting'],'failedGroups':len(status['failedGroups']),'requests':status['requests']},ensure_ascii=False),flush=True)
  if (ROOT/'repairs-ready').exists() and remaining==0 and status['verificationWaiting']==0 and status['pendingJobs']==0 and status['groupWaiting']==0 and not status['failedGroups']:
   s['finalStatus']=status;restore(s,'snapshot_completed');break
  if datetime.datetime.now(datetime.timezone.utc)>=datetime.datetime.fromisoformat(s['deadline'].replace('Z','+00:00')):
   s['finalStatus']=status;restore(s,'protective_deadline_requires_attention');break
  if (ROOT/'restore-now').exists():restore(s,'operator_requested');break
  time.sleep(30)
except BaseException as e:
 s['controllerError']=str(e);restore(s,'controller_error_requires_attention');raise
