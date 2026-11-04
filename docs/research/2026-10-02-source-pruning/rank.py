"""Rank observed source fitness for this site's current ingestion/editorial workflow."""
import json, sys
from pathlib import Path

def smooth(k,n,p,w=8): return (k+p*w)/(n+w)
def clip(x): return max(0,min(1,x))

def rank(snapshot):
    assert len(snapshot['rows'])==94 and len({r['id'] for r in snapshot['rows']})==94
    for r in snapshot['rows']:
        quality=100*(.45*smooth(r['passed'],r['analyzed'],.5)+.35*smooth(r['verified'],r['decided'],.5)+.20*smooth(r['readable'],r['articles'],.8,5))
        # mean_score/scored only cover PASS material with readable body. Unknowns are neutral.
        attention=(float(r['mean_score'] if r['mean_score'] is not None else 60)*r['scored']+60*8)/(r['scored']+8)
        authority={'T1':1,'T1_5':.85,'T2':.65}.get(r['tier'],.3)
        value=100*(.5*attention/100+.3*clip(smooth(r['selected'],r['analyzed'],.05,10)/.2)+.2*authority)
        dated=smooth(r['articles']-r['undated'],r['articles'],.8,5)
        current_dated=smooth(r['accepted_fresh'],r['accepted_fresh']+r['filtered_undated'],.8,10)
        stability=100*(.7*smooth(r['ok_runs'],r['ok_runs']+r['real_failures'],.95,5)+.15*dated+.15*current_dated)
        efficiency=100*clip(8*(r['public_items']+1)/(r['paid_attempts']+16))
        total=.30*quality+.35*value+.25*stability+.10*efficiency
        r['scores']={k:round(v,2) for k,v in dict(quality=quality,value=value,stability=stability,cost_efficiency=efficiency,total=total).items()}
        r['sortScore']=total
        r['evidenceConfidence']='low' if r['analyzed']<10 else 'medium' if r['analyzed']<30 else 'higher_sample'
    snapshot['rows'].sort(key=lambda r:(r['sortScore'],r['selected'],r['public_items'],r['id']))
    for i,r in enumerate(snapshot['rows'],1):
        r['rankAscending']=i
        r['decision']='pause' if i<=14 else 'retain'
        del r['sortScore']
    snapshot['weights']={'quality':30,'value':35,'stability':25,'cost_efficiency':10}
    snapshot['disabledIds']=[r['id'] for r in snapshot['rows'][:14]]
    snapshot['retainedIds']=[r['id'] for r in snapshot['rows'][14:]]
    assert len(snapshot['disabledIds'])==14 and len(snapshot['retainedIds'])==80
    assert all(0<=v<=100 for r in snapshot['rows'] for v in r['scores'].values())
    return snapshot

if __name__=='__main__':
    result=rank(json.loads(Path(sys.argv[1]).read_text()))
    Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    for r in result['rows'][:18]:
        print(r['rankAscending'],r['name'],r['id'],r['scores'], 'analyzed',r['analyzed'],'public',r['public_items'],'selected',r['selected'])
