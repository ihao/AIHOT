import unittest,tempfile,pathlib,json,unittest.mock as mock
SOURCE=pathlib.Path(__file__).with_name('controller.py').read_text()
class Restoration(unittest.TestCase):
 def execute(self,statuses,deadline='2099-01-01T00:00:00Z',phase='armed',restore_failure=False):
  with tempfile.TemporaryDirectory() as directory:
   root=pathlib.Path(directory);state={'budget':{'per_minute':20,'per_hour':300,'per_day':2000},'ids':['existing'],'sealedAt':'2026-10-01T15:00:00Z','deadline':deadline,'phase':phase}
   (root/'state.json').write_text(json.dumps(state));(root/'activate').touch();(root/'repairs-ready').touch();modes=[];compose=[]
   def command(args,**kwargs):
    if args[:2]==['docker','cp']:return ''
    if args[:2]==['docker','exec']:
     mode=args[-1];modes.append(mode)
     if mode=='relax':return json.dumps({'relaxed':True})
     if mode=='status':
      result=statuses.pop(0)
      if isinstance(result,Exception):raise result
      return json.dumps(result)
     if mode=='restore':
      if restore_failure and modes.count('restore')==1:raise RuntimeError('temporary unavailable API')
      return json.dumps({'restored':True,'budget':state['budget']})
    if args[:2]==['docker','compose']:compose.append(args);return ''
    raise AssertionError(args)
   source=SOURCE.replace("pathlib.Path('/srv/9btc-ops/backlog-20261001')",'pathlib.Path('+repr(directory)+')')
   with mock.patch('subprocess.check_output',side_effect=command),mock.patch('time.sleep',return_value=None):
    try:exec(compile(source,'controller.py','exec'),{})
    except SystemExit:pass
   return json.loads((root/'state.json').read_text()),modes,compose
 def test_pending_batch_then_complete_restores_exact_budget_and_normal_worker(self):
  waiting={'counts':[{'processing_state':'new','count':1}],'verificationWaiting':0,'pendingJobs':1,'groupWaiting':0,'failedGroups':[],'requests':3}
  done={**waiting,'counts':[{'processing_state':'analyzed','count':1}],'pendingJobs':0}
  state,modes,compose=self.execute([waiting,done])
  self.assertEqual(modes,['relax','status','status','restore']);self.assertEqual(state['restoreReason'],'snapshot_completed')
  self.assertEqual(state['restoration']['budget'],{'per_minute':20,'per_hour':300,'per_day':2000})
  self.assertEqual(len(compose),1);self.assertNotIn('/srv/9btc-ops/backlog-20261001/worker.yml',compose[0]);self.assertEqual(state['phase'],'restored')
 def test_deadline_restores_even_with_backlog(self):
  waiting={'counts':[{'processing_state':'new','count':1}],'verificationWaiting':1,'pendingJobs':1,'groupWaiting':1,'failedGroups':[{}],'requests':9}
  state,modes,_=self.execute([waiting],deadline='2000-01-01T00:00:00Z')
  self.assertEqual(state['restoreReason'],'protective_deadline_requires_attention');self.assertEqual(modes[-1],'restore')
 def test_restart_mid_restoration_retries_restore_without_relaxing_again(self):
  state,modes,_=self.execute([],phase='restoring',restore_failure=True)
  self.assertEqual(modes,['restore','restore']);self.assertEqual(state['phase'],'restored')
 def test_temporary_api_recreate_preserves_batch(self):
  done={'counts':[{'processing_state':'analyzed','count':1}],'verificationWaiting':0,'pendingJobs':0,'groupWaiting':0,'failedGroups':[],'requests':10}
  state,modes,_=self.execute([RuntimeError('API recreating'),done])
  self.assertEqual(state['restoreReason'],'snapshot_completed');self.assertEqual(modes.count('restore'),1)
if __name__=='__main__':unittest.main()
