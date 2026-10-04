// Bounded, resumable shadow evaluation. Inputs/results stay private; no publication writes.
// node scripts/eval-verification.ts --dataset .data/cases.json --output .data/results.json [--dry-run]
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {config} from '../packages/backend/src/config.ts';
import {sql,closeDb} from '../packages/backend/src/db.ts';
import {sha256,stableJson} from '../packages/backend/src/lib/ids.ts';
import {chatJson,MODELS,ModelOutputError} from '../packages/backend/src/providers/llm.ts';
import {modelCostOverview} from '../packages/backend/src/providers/model-cost.ts';
import {assessVerificationCase,validateAssessmentCases} from '../packages/backend/src/editorial/verification-assessment.ts';
import {deterministicCopyConflicts} from '../packages/backend/src/editorial/automatic-verification.ts';
import {executionConfig,ordinaryVerificationEligible,routeVerificationModel,verificationRequest} from '../packages/backend/src/editorial/verification-execution.ts';

const flag=(name:string)=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const datasetPath=flag('--dataset'),outputPath=flag('--output');
if(!datasetPath||!outputPath)throw new Error('--dataset and --output are required private file paths');
const model=flag('--model')??'dashscope-deepseek-v4.1-flash',profile='bounded-v1';
if(model!=='dashscope-deepseek-v4.1-flash'||!MODELS[model])throw new Error('only the frozen ordinary candidate can be assessed');
const cases=validateAssessmentCases(JSON.parse(await readFile(datasetPath,'utf8')));
const cfg=executionConfig(profile);
const datasetHash=sha256(stableJson(cases));
const spec=MODELS[model]!;
const executionHash=sha256(stableJson({profile,model,actualModel:spec.model,service:spec.service,extra:spec.extra,system:cfg.system,promptVersion:cfg.promptVersion,maxTokens:cfg.maxTokens,temperature:cfg.temperature}));
const scope=cases.map(c=>{
  const input={first_party:c.firstParty,title:c.originalTitle,body_text:c.originalBodyText,category:c.category,output:{},title_zh:c.copy.titleZh,summary_zh:c.copy.summaryZh,reason_zh:c.copy.reasonZh,conflicts:deterministicCopyConflicts(c.copy,c.materials)};
  const eligible=ordinaryVerificationEligible(input);
  const routed=routeVerificationModel(input,'qwen3.8-max',{enabled:true,ordinaryModel:model});
  if(c.family.startsWith('official_')&&(!eligible||routed!==model))throw new Error(`official case outside the frozen route: ${c.id}`);
  if(!c.family.startsWith('official_')&&routed!=='qwen3.8-max')throw new Error(`boundary case incorrectly routed: ${c.id}`);
  return {id:c.id,eligible,routed};
});
interface Result {id:string;family:string;expectedPublic:boolean;public:boolean;structureValid:boolean;citationsValid:boolean;reasons:string[];receiptId:number|null;verifier?:unknown;usage?:unknown;error?:string;differenceReview?:string}
interface Report {datasetHash:string;executionHash:string;model:string;profile:string;labelBasis:string;articles:number;sources:number;cases:number;scope:typeof scope;results:Result[];state:string;blockedReason?:string;moneyBefore?:unknown;moneyAfter?:unknown;cost?:unknown;summary?:unknown;startedAt:string;updatedAt:string;gateFixtures:unknown}
let report:Report={datasetHash,executionHash,model,profile,labelBasis:'agent_literal_source_review',articles:new Set(cases.map(c=>c.articleId)).size,sources:new Set(cases.map(c=>c.sourceId)).size,cases:cases.length,scope,results:[],state:'prepared',startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),gateFixtures:{scores:[80,80],threshold:60,sourceAuthorized:true,sourceEnabled:true,relevance:'PASS',bodyReadable:true,publicationWrites:false,boundaryModel:'ordinary-candidate shadow; production boundary route remains Max'}};
try {
  const previous=JSON.parse(await readFile(outputPath,'utf8')) as Report;
  if(previous.datasetHash!==datasetHash||previous.executionHash!==executionHash)throw new Error('existing report belongs to another dataset or execution policy');
  report=previous;
}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
const save=async()=>{await mkdir(dirname(outputPath),{recursive:true,mode:0o700});report.updatedAt=new Date().toISOString();await writeFile(outputPath+'.tmp',JSON.stringify(report,null,2),{mode:0o600});await rename(outputPath+'.tmp',outputPath);};
const summarize=()=>{
  const ordinary=report.results.filter(r=>r.family.startsWith('official_'));
  const supported=ordinary.filter(r=>r.expectedPublic),negative=ordinary.filter(r=>!r.expectedPublic);
  const differences=report.results.filter(r=>r.public!==r.expectedPublic);
  const complete=report.results.length===cases.length;
  return {complete,evaluated:report.results.length,supportedAccepted:supported.filter(r=>r.public).length,supportedTotal:supported.length,ordinaryFalseAcceptances:negative.filter(r=>r.public).length,negativeTotal:negative.length,invalidStructure:report.results.filter(r=>!r.structureValid).length,invalidCitations:report.results.filter(r=>!r.citationsValid).length,differences:differences.map(r=>({id:r.id,expected:r.expectedPublic,actual:r.public,reasons:r.reasons,review:r.differenceReview??null})),passed:complete&&supported.length>=40&&negative.length>=40&&supported.filter(r=>r.public).length/supported.length>=.95&&negative.every(r=>!r.public)&&report.results.every(r=>r.structureValid&&r.citationsValid)&&differences.every(r=>!!r.differenceReview)};
};
if(process.argv.includes('--dry-run')){report.summary=summarize();await save();console.log(JSON.stringify({state:'prepared',datasetHash,executionHash,cases:cases.length,articles:report.articles,sources:report.sources}));process.exit(0);}
try {
  if(!config.modelCallsEnabled)throw new Error('model valve is disabled');
  const money=await modelCostOverview();report.moneyBefore??=money;
  if(!money.policy.enabled||money.policy.dayLimitCny>9||money.policy.rollingLimitCny>9)throw new Error('an enabled shared <=9 CNY day and rolling guard is mandatory');
  const originals=await sql<{id:string;source_id:string;title:string;url:string;body_text:string;first_party:boolean}[]>`SELECT a.id,a.source_id,a.title,a.url,a.body_text,s.first_party FROM articles a JOIN sources s ON s.id=a.source_id WHERE a.id IN ${sql([...new Set(cases.map(c=>c.articleId))])}`;
  const byId=new Map(originals.map(a=>[a.id,a]));
  for(const c of cases){const a=byId.get(c.articleId);if(!a||a.source_id!==c.sourceId||a.title!==c.originalTitle||a.url!==c.sourceUrl||a.body_text!==c.originalBodyText||a.first_party!==c.firstParty)throw new Error(`live article/source snapshot differs: ${c.id}`);}
  const done=new Set(report.results.map(r=>r.id));report.state='running';delete report.blockedReason;await save();
  for(const c of cases){
    if(done.has(c.id))continue;
    const request=verificationRequest({copy:c.copy,original_copy:c.copy,originalTitle:c.originalTitle,materials:c.materials,requiresPrimaryEvidence:!c.firstParty&&c.family==='risk_boundary',rewritten:false},model,profile,`model-budget-assessment:${datasetHash}:${executionHash}:${c.id}`,`benchmark:${datasetHash}:${c.id}`);
    try {
      const response=await chatJson({...request,purpose:'verification_benchmark'});
      const assessment=assessVerificationCase(c,response.data);
      report.results.push({id:c.id,family:c.family,expectedPublic:c.expectedPublic,public:assessment.decision.public,structureValid:assessment.structureValid,citationsValid:assessment.citationsValid,reasons:assessment.decision.reasons,receiptId:response.receiptId,verifier:response.data,usage:response.usage});
    } catch(error){
      if(error instanceof ModelOutputError)report.results.push({id:c.id,family:c.family,expectedPublic:c.expectedPublic,public:false,structureValid:false,citationsValid:false,reasons:['model_output_invalid'],receiptId:error.receiptId,error:error.message.slice(0,300)});
      else {report.state='blocked';report.blockedReason=error instanceof Error?error.message.slice(0,300):String(error);await save();break;}
    }
    await save();
    // Existing service request-count limits also apply; the worker may consume part of this window.
    await new Promise(resolve=>setTimeout(resolve,3100));
  }
  report.moneyAfter=await modelCostOverview();
  const [cost]=await sql`SELECT count(*)::int attempts,coalesce(sum(a.model_cost_cny),0) estimated_or_retained_cny,count(*) FILTER(WHERE a.model_cost_state='retained')::int retained FROM receipt_attempts a JOIN receipts r ON r.id=a.receipt_id WHERE r.purpose='verification_benchmark' AND r.logical_key LIKE ${'%:model-budget-assessment:'+datasetHash+':'+executionHash+':%'} AND a.origin='live'`;
  report.cost=cost;report.summary=summarize();
  if(report.state!=='blocked')report.state='evaluated';
  await save();console.log(JSON.stringify({state:report.state,datasetHash,executionHash,cost,summary:report.summary,blockedReason:report.blockedReason}));
} finally {await closeDb();}
