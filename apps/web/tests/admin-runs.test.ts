import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

// The Node test runner cannot load TSX. Compile the real route in memory; browser-only
// hooks and admin controls are replaced with small renderers while React renders its JSX.
const source=readFileSync(new URL('../app/routes/admin/runs.tsx',import.meta.url),'utf8');
const transformed=await transformWithOxc(source,'admin-runs.tsx',{lang:'tsx',jsx:{runtime:'automatic'}});
const code=transformed.code.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g,(_m,names,path)=>`const {${names.replace(/\s+as\s+/g,': ')}}=require(${JSON.stringify(path)});`)
 .replace(/export default function /g,'function ').replace(/export (async function|const) /g,'$1 ')+'\nexports.default=RunsAdmin;';
const component=(p:any)=>React.createElement('div',null,p.title,p.label,p.value,p.hint,p.children);
const exports:any={};
vm.runInNewContext(code,{exports,require:(name:string)=>{
 if(name==='react/jsx-runtime')return jsxRuntime;
 if(name==='react')return {useState:(value:any)=>[value,()=>{}],useEffect:()=>{}};
 if(name==='react-router')return {Link:component,useFetcher:()=>({state:'idle'})};
 if(name==='@aihot/industry/site')return {SITE:{name:'9BTC'}};
 if(name.includes('admin.server'))return {};
 if(name.endsWith('/action'))return {useAdminAction:()=>({pending:null})};
 if(name.endsWith('/format'))return {num:String,bj:()=>'',ago:()=>'',duration:()=>''};
 if(name.endsWith('/ui'))return new Proxy({},{get:()=>component});
 throw new Error(`Unexpected frontend dependency: ${name}`);
}});
const fixture=(state='normal')=>({checkedAt:'2026-10-03',processes:[],jobs:[],timeline:[],queues:[],failedJobs:[],lagging:[],receipts:{counts:{},issues:[]},deliveries:[],errors:[],retrying:{count:0},ingest:[],leaderboard:null,
 automatic:{counts:{accepted:6,rejected:94},acceptanceRate:0.06,failed:0,missingEvidence:0,disagreement:0,sourcePauses:[],recent:[],reasons:[],
 current:{collected:12,passed:10,scoreQualified:8,public:4,selected:0,counts:{accepted:4,rejected:1},acceptanceRate:0.8,diagnostics:[{reason:'quote_invalid',n:2},{reason:'pdf_unreadable',n:1},{reason:'primary_evidence_unverified',n:1}],historicalDiagnostics:[],selectionState:state,highScoreWaiting:3}}});
const render=(state='normal')=>renderToStaticMarkup(exports.default({loaderData:fixture(state)}));
test('current unique article rate and historical round rate have separate reader labels',()=>{
 const html=render();assert.match(html,/当前文章 · 最近24小时采集/);assert.match(html,/当前核验接受比例：80%/);
 assert.match(html,/历史核验轮次 · 最近24小时/);assert.match(html,/轮次接受比例/);assert.match(html,/6%/);
 assert.match(html,/本次核验记录的取证问题/);assert.match(html,/可含已解决问题/);
 assert.match(html,/引用与原文不一致 2/);assert.match(html,/PDF 无法读取 1/);assert.match(html,/一手证据未获核验支持 1/);
 assert.doesNotMatch(html,/quote_invalid|pdf_unreadable/);
});
test('investigation status appears only when the backend reports an aged high score candidate',()=>{
 assert.doesNotMatch(render(),/需要检查：/);assert.match(render('investigate'),/需要检查：3 篇新鲜文章连续评分达标已满4小时/);
});
