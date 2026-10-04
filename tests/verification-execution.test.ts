import { stub, tag } from './setup.ts';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { config } from '../packages/backend/src/config.ts';
import { sql, closeDb } from '../packages/backend/src/db.ts';
import { upsertMaterial } from '../packages/backend/src/content/materials.ts';
import { setSourceAutoPublic } from '../packages/backend/src/editorial/review.ts';
import { AUTOMATIC_RULE_VERSION, queueAutomaticVerificationTx, verifyAutomaticArticle } from '../packages/backend/src/editorial/automatic-verification.ts';
import { fetchItemsByIds } from '../packages/backend/src/publication/items.ts';
import { stopBoss } from '../packages/backend/src/jobs/queue.ts';
import { invalidateModelCache } from '../packages/backend/src/editorial/models.ts';
import { promptText, promptVersion } from '../packages/backend/src/editorial/prompts.ts';
import { materialQuotes, promptMaterials, type Material } from '../packages/backend/src/editorial/evidence-materials.ts';
import { chatJson, chatJsonRequestIdentity, MODELS } from '../packages/backend/src/providers/llm.ts';
import { VerificationSchema } from '../packages/backend/src/editorial/automatic-policy.ts';
import { logicalKeyFor } from '../packages/backend/src/providers/receipts.ts';
import { sha256, stableJson } from '../packages/backend/src/lib/ids.ts';
import * as executionModule from '../packages/backend/src/editorial/verification-execution.ts';

const execution = () => executionModule;
const ordinaryModel = 'dashscope-deepseek-v4.1-flash';
const ordinary = {first_party:true,title:'Bitcoin Core release',body_text:'A maintenance software version is available.',category:'infrastructure',output:{itemType:'protocol_upgrade'},title_zh:'Bitcoin Core 新版本发布',summary_zh:'新客户端版本可供下载。',reason_zh:null};
const copy = {titleZh:ordinary.title_zh,summaryZh:ordinary.summary_zh,reasonZh:null,category:ordinary.category};
const material: Material = {id:'original',role:'original_source',url:'https://bitcoincore.org/',primary:true,bodyText:'Only the test network is supported.\n\nThe upgrade is available for testing.\n\nThis does not activate the main network.\n\nThe upgrade is available for testing.\n\nActivation requires a later release.'};

test('ordinary routing requires explicit activation and never uses model confidence as scope', () => {
  const e=execution();
  assert.equal(e.ordinaryVerificationEligible(ordinary),true);
  for (const settings of [undefined,{}, {enabled:false}, {enabled:'true'}]) assert.equal(e.routeVerificationModel(ordinary,'qwen3.8-max',settings as executionModule.VerificationRoutingSettings),'qwen3.8-max');
  assert.equal(e.routeVerificationModel(ordinary,'qwen3.8-max',{enabled:true,ordinaryModel}),ordinaryModel);
  assert.equal(e.routeVerificationModel(ordinary,'qwen3.8-max',{enabled:true,ordinaryModel:'deepseek-flash'}),'qwen3.8-max');
  for (const first_party of [false,undefined]) assert.equal(e.routeVerificationModel({...ordinary,first_party:first_party as boolean,output:{...ordinary.output,confidence:1}},'qwen3.8-max',{enabled:true,ordinaryModel}),'qwen3.8-max');
});

test('original risks remain on Max when Chinese copy and model risk flags appear ordinary', () => {
  const e=execution(),settings={enabled:true,ordinaryModel};
  const cases=[
    {title:'Protocol was hacked',body_text:'The client release is available.'},
    {body_text:'An attacker stole $10 million. The release notes describe a patch.'},
    {body_text:'SEC approved the rule.'},
    {body_text:'The governance proposal was executed.'},
    {summary_zh:'升级治理提案已执行。'},
    {reason_zh:'此次攻击已确认。'},
    ...['security','policy','regulation','governance'].map(category=>({category})),
    ...['security_incident','policy_update','regulatory_action','governance_execution','loss_report'].map(itemType=>({output:{itemType,confidence:1,riskFlags:[]}})),
    {output:{itemType:'protocol_upgrade',conflict:true}},
    {output:{itemType:'protocol_upgrade',conflictStatus:'contradicted'}},
    {conflicts:['copy_amount_conflict']},
  ];
  for (const change of cases) assert.equal(e.routeVerificationModel({...ordinary,...change},'qwen3.8-max',settings),'qwen3.8-max',JSON.stringify(change));
});

test('bounded materials keep literal paragraph IDs, negation, conditions and source metadata', () => {
  const e=execution();
  const secondary={...material,id:'secondary',primary:false,url:'https://example.com/story'};
  const materials=[material,secondary];
  const bounded=e.executionMaterials(materials,'bounded-v1');
  const quotes=materialQuotes(material);
  assert.deepEqual(bounded[0],{id:material.id,role:material.role,url:material.url,primary:true,quotes:[quotes[0],quotes[1],quotes[2],quotes[4]]});
  assert.equal(bounded[1].primary,false);
  assert.equal(bounded[1].quotes.length,4,'duplicate filtering is per material, never across source identity');
  assert.equal(bounded[1].quotes[0].quoteId,'secondary:p1');
  assert.deepEqual(e.executionMaterials(materials,'legacy-v1'),promptMaterials(materials));
  assert.equal(materials[0]!.bodyText,material.bodyText,'stored original input is never shortened');
});

test('legacy config, payload and logical receipt identity remain byte-for-byte unchanged', () => {
  const e=execution(),input={copy,original_copy:copy,originalTitle:ordinary.title,materials:[material],requiresPrimaryEvidence:false,rewritten:false};
  const legacy=e.executionConfig('legacy-v1');
  assert.deepEqual(legacy,{system:promptText('verify-summary'),promptVersion:promptVersion('verify-summary'),temperature:0,maxTokens:16384});
  const bounded=e.executionConfig('bounded-v1');
  assert.deepEqual(bounded,{...legacy,maxTokens:4096});
  assert.equal(e.executionConfig('legacy-v1','rewrite-verified-summary').maxTokens,4096);
  const legacyRewrite=e.executionConfig('legacy-v1','rewrite-verified-summary');
  assert.deepEqual(legacyRewrite,{system:promptText('rewrite-verified-summary'),promptVersion:promptVersion('rewrite-verified-summary'),temperature:0.2,maxTokens:4096});
  const expectedUser=stableJson({...input,primaryEvidenceScope:'claims',materials:promptMaterials(input.materials)});
  const request=e.verificationRequest(input,'qwen3.8-max','legacy-v1','stable-stage','article:fixture@1');
  assert.equal(request.user,expectedUser);
  const expectedOptions={...request,system:promptText('verify-summary'),promptVersion:promptVersion('verify-summary'),temperature:0,maxTokens:16384,user:expectedUser};
  assert.equal(logicalKeyFor(chatJsonRequestIdentity(request).receiptRequest),logicalKeyFor(chatJsonRequestIdentity(expectedOptions).receiptRequest));
  const spec=MODELS['qwen3.8-max']!;
  const expectedHash=sha256(stableJson({model:spec.model,service:spec.service,extra:spec.extra??null,jsonMode:spec.jsonMode,system:legacy.system,promptVersion:legacy.promptVersion,temperature:0,maxTokens:16384}));
  assert.equal(e.executionModelConfigHash('qwen3.8-max','legacy-v1'),expectedHash);
  assert.notEqual(e.executionModelConfigHash('qwen3.8-max','bounded-v1'),expectedHash);
  assert.equal(e.executionModelConfigHash('qwen3.8-max','legacy-v1','rewrite-verified-summary'),sha256(stableJson({model:spec.model,service:spec.service,extra:spec.extra??null,jsonMode:spec.jsonMode,...legacyRewrite})));
  assert.equal(AUTOMATIC_RULE_VERSION,'automatic-publication-v1:743f241ab8a474544fda3e20');
});

const T=tag(),source=`execution-${T}`;
const calls: Array<Record<string,any>>=[];
let verdicts: string[]=[];
const checks={claimsComplete:true,chineseCopyFaithful:true,subject:true,numbers:true,units:true,time:true,chain:true,stage:true,attribution:true,noSpeculationAsFact:true,notMarketing:true,coreEventPreserved:true};
const provider=await stub((_hit,request)=>{
  const body=JSON.parse(request.body);calls.push(body);
  const input=JSON.parse(body.messages.at(-1).content),m=input.materials[0];
  if(String(body.messages[0].content).includes('依据已抓取材料修正')) return {choices:[{message:{content:JSON.stringify({...input.copy,titleZh:'Bitcoin Core 发布新版客户端软件',summaryZh:'Bitcoin Core 发布新版客户端软件。'})}}],usage:{prompt_tokens:1,completion_tokens:1}};
  const verdict=verdicts.shift()??'supported';
  return {choices:[{message:{content:JSON.stringify({verdict,claims:[{claim:input.copy.titleZh,verdict,evidence:verdict==='supported'?[{materialId:m.id,quoteId:m.quotes[0].quoteId}]:[],riskFlags:[],reason:'本机逐段证据'}],checks,riskFlags:[],reason:'本机证据'})}}],usage:{prompt_tokens:1,completion_tokens:1}};
});
Object.assign(process.env,{LLM_BASE_URL:`${provider.url}/v1`,LLM_API_KEY:'local-test-key',LLM_MODEL:'qwen3.8-max',DASHSCOPE_BASE_URL:`${provider.url}/v1`,DASHSCOPE_API_KEY:'local-test-key',VERIFICATION_MODEL:'qwen3.8-max',UNDERSTAND_MODEL:'qwen3.8-flash'});
invalidateModelCache();
const oldMode=config.editorialMode,oldCalls=config.modelCallsEnabled;
const oldFetch=globalThis.fetch;
globalThis.fetch=(request,init)=>{
  const u=new URL(typeof request==='string'?request:request instanceof URL?request.href:request.url);
  assert.equal(u.hostname,'127.0.0.1','all provider requests must stay on localhost');
  return oldFetch(request,init);
};
let savedSetting:any, budgets:any[];
before(async()=>{
  config.editorialMode='automatic';config.modelCallsEnabled=true;
  [savedSetting]=await sql`SELECT * FROM settings WHERE key='verification.routing'`;
  await sql`INSERT INTO settings(key,value) VALUES('verification.routing','{"enabled":false}') ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
  budgets=await sql`SELECT * FROM budgets WHERE service='dashscope'`;
  await sql`UPDATE budgets SET per_minute=1000,per_hour=10000,per_day=100000 WHERE service='dashscope'`;
  await sql`INSERT INTO sources(id,name,kind,config,tier,participation_mode,first_party,next_fetch_at) VALUES(${source},'Synthetic execution primary','rss','{}','T1','editorial',true,'2100-01-01')`;
  await setSourceAutoPublic(source,{enabled:true,version:0,reason:'local execution fixture'},'test');
});
after(async()=>{
  config.editorialMode=oldMode;config.modelCallsEnabled=oldCalls;globalThis.fetch=oldFetch;
  if(savedSetting) await sql`UPDATE settings SET value=${sql.json(savedSetting.value)} WHERE key='verification.routing'`;
  else await sql`DELETE FROM settings WHERE key='verification.routing'`;
  for(const b of budgets) await sql`UPDATE budgets SET per_minute=${b.per_minute},per_hour=${b.per_hour},per_day=${b.per_day} WHERE service=${b.service}`;
  await provider.close();await stopBoss();await closeDb();
});
let serial=0;
async function article(bodyText=material.bodyText,title=ordinary.title){
  const {articleId}=await upsertMaterial({sourceId:source,url:`https://bitcoincore.org/${T}/${++serial}`,title,bodyText,bodyStatus:'ok',via:'fetch',publishedAt:new Date()});
  await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected,output) VALUES(${articleId},1,'model','pass',${copy.category},${copy.titleZh},${copy.summaryZh},75,true,${sql.json({scores:[75,76],threshold:60,itemType:'protocol_upgrade',authorRole:'principal'})})`;
  await sql`UPDATE articles SET processing_state='analyzed',grouped_at=now() WHERE id=${articleId}`;
  await sql.begin(tx=>queueAutomaticVerificationTx(tx,articleId));
  return articleId;
}

test('new rounds persist bounded execution while routing stays disabled by default',async()=>{
  const id=await article();
  const [r]=await sql`SELECT * FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(r.execution_policy,'bounded-v1');
  assert.equal(r.verification_model,'qwen3.8-max');
  await verifyAutomaticArticle(id);
  assert.equal(calls.at(-1)!.max_tokens,4096);
  const sent=JSON.parse(calls.at(-1)!.messages.at(-1).content);
  assert.deepEqual(sent.materials[0].quotes.map((q:any)=>q.quoteId),['original:p1','original:p2','original:p3','original:p5']);
  const [stored]=await sql`SELECT materials,status FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(stored.materials[0].bodyText,material.bodyText);
  assert.equal(stored.status,'accepted');
});

test('explicit routing only selects models for newly queued rounds and preserves accepted grants',async()=>{
  const id=await article();await verifyAutomaticArticle(id);
  const pending=await article();
  const before=await sql`SELECT * FROM automatic_verifications WHERE article_id=${id}`;
  assert.ok((await fetchItemsByIds([id])).has(id));
  await verifyAutomaticArticle(pending);assert.equal(calls.at(-1)!.model,'qwen3.8-max','a pending round keeps the model chosen before activation');
  await sql`UPDATE settings SET value=${sql.json({enabled:true,ordinaryModel,assessmentHash:'local-test'})} WHERE key='verification.routing'`;
  await sql.begin(tx=>queueAutomaticVerificationTx(tx,id));await verifyAutomaticArticle(id);
  assert.deepEqual(await sql`SELECT * FROM automatic_verifications WHERE article_id=${id}`,before);
  assert.ok((await fetchItemsByIds([id])).has(id));
  const next=await article();
  const [r]=await sql`SELECT * FROM automatic_verifications WHERE article_id=${next}`;
  assert.equal(r.verification_model,ordinaryModel);
  await verifyAutomaticArticle(next);assert.equal(calls.at(-1)!.model,'deepseek-v4.1-flash');
  const risk=await article('The protocol was hacked. A patch is available.');
  const [riskRound]=await sql`SELECT verification_model FROM automatic_verifications WHERE article_id=${risk}`;
  assert.equal(riskRound.verification_model,'qwen3.8-max');
  await sql`UPDATE settings SET value='{"enabled":false}' WHERE key='verification.routing'`;
});

test('bounded rewrite uses the same literal duplicate filtering and retains original snapshots',async()=>{
  const id=await article(),before=calls.length;
  verdicts=['contradicted','supported'];
  await verifyAutomaticArticle(id);
  const stages=calls.slice(before),rewrite=stages.find(call=>String(call.messages[0].content).includes('依据已抓取材料修正'))!;
  assert.equal(stages.length,3);assert.equal(rewrite.max_tokens,4096);
  const payload=JSON.parse(rewrite.messages.at(-1).content);
  assert.deepEqual(payload.materials[0].quotes.map((q:any)=>q.quoteId),['original:p1','original:p2','original:p3','original:p5']);
  const [r]=await sql`SELECT status,rewritten,materials,original_copy FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(r.status,'accepted');assert.equal(r.rewritten,true);
  assert.equal(r.materials[0].bodyText,material.bodyText);assert.deepEqual(r.original_copy,copy);
});

test('migration retains legacy default for old inserts and refuses unknown policy versions',async()=>{
  const id=await article();
  const [prior]=await sql`INSERT INTO automatic_verifications(article_id,article_revision,analysis_id,automatic_rule_version,verification_model,verification_config_hash,source_policy_version,original_copy_hash,final_copy_hash,original_copy,final_copy,materials)
    SELECT article_id,article_revision,analysis_id,${`legacy-fixture:${T}`},verification_model,verification_config_hash,source_policy_version,original_copy_hash,final_copy_hash,original_copy,final_copy,materials
    FROM automatic_verifications WHERE article_id=${id} RETURNING id,execution_policy`;
  assert.equal(prior.execution_policy,'legacy-v1');
  await assert.rejects(sql`UPDATE automatic_verifications SET execution_policy='unrecognized-v9' WHERE id=${prior.id}`,/execution_policy_check/);
});

test('bounded distinct evidence above the input cap refuses a paid request without truncation',async()=>{
  const bodyText=Array.from({length:500},(_,i)=>`Paragraph ${i}: ${'x'.repeat(130)}`).join('\n\n');
  const id=await article(bodyText),before=provider.hits();
  await verifyAutomaticArticle(id);
  assert.equal(provider.hits(),before);
  const [r]=await sql`SELECT status,reasons,materials FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(r.status,'rejected');assert.deepEqual(r.reasons,['verification_input_budget_exceeded']);
  assert.equal(r.materials[0].bodyText,bodyText);
});

test('legacy oversized exact successful receipts are reused without sending bounded replacements',async()=>{
  const e=execution(),bodyText='A large original paragraph. '+ 'x'.repeat(61000),id=await article(bodyText);
  await sql`UPDATE automatic_verifications SET execution_policy='legacy-v1',verification_config_hash=${e.executionModelConfigHash('qwen3.8-max','legacy-v1')},rewrite_config_hash=${e.executionModelConfigHash('qwen3.8-flash','legacy-v1','rewrite-verified-summary')} WHERE article_id=${id}`;
  const [r]=await sql`SELECT * FROM automatic_verifications WHERE article_id=${id}`;
  const input={copy:r.final_copy,original_copy:r.original_copy,originalTitle:ordinary.title,materials:r.materials,requiresPrimaryEvidence:false,rewritten:false};
  const request=e.verificationRequest(input,r.verification_model,'legacy-v1',`automatic:${r.id}:${r.automatic_rule_version}:analysis:${r.analysis_id}:initial`,`article:${id}@1`);
  const receipt=await chatJson(request),before=provider.hits();
  assert.equal(calls.at(-1)!.max_tokens,16384);
  await verifyAutomaticArticle(id);assert.equal(provider.hits(),before);
  const [accepted]=await sql`SELECT status,receipt_ids,execution_policy FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(accepted.status,'accepted');assert.ok(accepted.receipt_ids.includes(receipt.receiptId));assert.equal(accepted.execution_policy,'legacy-v1');
  const [completed]=await sql`SELECT status FROM receipts WHERE id=${receipt.receiptId}`;assert.equal(completed.status,'completed');
});
