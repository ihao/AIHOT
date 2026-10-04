import './setup.ts';
import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stub} from './setup.ts';
const {sql,closeDb}=await import('@aihot/backend/db');
after(closeDb);
const exec=promisify(execFile);
const body='Version 2 enters beta.';
function fixture(){
  const base={sourceId:'fixture-source',sourceUrl:'https://example.test/source',originalTitle:body,firstParty:true,category:'infrastructure',originalBodyText:body,copy:{titleZh:'版本2进入测试阶段',summaryZh:'官方宣布版本2进入测试阶段。',reasonZh:null,category:'infrastructure'},materials:[{id:'original',url:'https://example.test/source',bodyText:body,primary:true,role:'original_source'}],expectedPublic:true,family:'official_supported',expectedIssue:null,evidenceQuote:body,labelBasis:'agent_literal_source_review',sourceSpanStart:0,sourceSpanEnd:body.length};
  return [...Array.from({length:40},(_,i)=>({...base,id:`p${i}`,articleId:`a${i}`})),...Array.from({length:40},(_,i)=>({...base,id:`n${i}`,articleId:`a${i}`,expectedPublic:false,family:'official_negative',expectedIssue:'wrong version',copy:{...base.copy,titleZh:'版本3进入测试阶段'}})),...Array.from({length:20},(_,i)=>({...base,id:`b${i}`,articleId:`b${i}`,firstParty:false,family:'secondary_boundary',materials:base.materials.map(m=>({...m,primary:false}))}))];
}

test('assessment preflight can inspect fixtures but refuses paid evaluation when the shared guard is disabled',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'verification-assessment-'));
  const dataset=join(dir,'cases.json'),output=join(dir,'report.json');
  const provider=await stub(()=>assert.fail('preflight cannot buy a model call'));
  const [previous]=await sql`SELECT enabled FROM model_cost_policy WHERE id=1`;
  await sql`UPDATE model_cost_policy SET enabled=false WHERE id=1`;
  try {
    await writeFile(dataset,JSON.stringify(fixture()));
    const args=['scripts/eval-verification.ts','--dataset',dataset,'--output',output];
    const env={...process.env,MODEL_CALLS_ENABLED:'true',DASHSCOPE_API_KEY:'test',DASHSCOPE_BASE_URL:provider.url};
    await exec(process.execPath,[...args,'--dry-run'],{env,timeout:20_000});
    assert.equal(JSON.parse(await readFile(output,'utf8')).results.length,0);
    await assert.rejects(exec(process.execPath,args,{env,timeout:20_000}),error=>/shared <=9 CNY day and rolling guard is mandatory/.test(String((error as {stderr?:string}).stderr)));
    assert.equal(provider.hits(),0);
    await sql`UPDATE model_cost_policy SET enabled=true WHERE id=1`;
    await assert.rejects(exec(process.execPath,args,{env,timeout:20_000}),error=>/live article\/source snapshot differs/.test(String((error as {stderr?:string}).stderr)));
    assert.equal(provider.hits(),0,'fabricated assessment snapshots cannot trigger a provider call');
  } finally {
    await sql`UPDATE model_cost_policy SET enabled=${previous!.enabled} WHERE id=1`;
    await provider.close();await rm(dir,{recursive:true,force:true});
  }
});
