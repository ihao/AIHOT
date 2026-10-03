// Only fetched literal locations are candidates. Host approval never proves a claim.
import { load } from 'cheerio';
import { PRIMARY_EVIDENCE_HOSTS, PRIMARY_EVIDENCE_POLICY_VERSION } from '@aihot/industry/evidence';
import { guardedFetch } from '../lib/http-fetch.ts';
import { readable } from '../content/readable.ts';
import { sha256 } from '../lib/ids.ts';
import { extractPdfEvidence, PDF_EVIDENCE_LIMITS } from './pdf-evidence.ts';
import { materialQuotes, type VerificationMaterial } from './automatic-policy.ts';
export { materialQuotes, CLAIM_QUOTE_VERSION } from './automatic-policy.ts';
export const EVIDENCE_CONFIG = { version: 'evidence-materials-v3', hostPolicy: PRIMARY_EVIDENCE_POLICY_VERSION,
  hosts: PRIMARY_EVIDENCE_HOSTS, maxMaterials: 2, maxBytes: 6*1024*1024, deadlineMs: 20_000, maxRedirects: 5,
  forum: {host:'forum.arbitrum.foundation',username:'Arbitrum',userId:7,categoryId:52}, pdf:PDF_EVIDENCE_LIMITS } as const;
export interface Material extends VerificationMaterial { url: string; role?: 'original_source'|'official_document'|'official_forum_statement'; forumIdentity?: {topicId:number;username:string;userId:number;categoryId:number;postNumber:number} }
export type EvidenceDiagnostic = 'fetched'|'unsupported_entry'|'fetch_failed'|'identity_mismatch'|'pdf_unreadable'|'body_unreadable';
export interface EvidenceResult { material: Material|null; diagnostic: EvidenceDiagnostic; url:string }
export function approvedPrimaryUrl(value:string) {
  try { const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&PRIMARY_EVIDENCE_HOSTS.some(d=>u.hostname===d||u.hostname===`www.${d}`); } catch {return false;}
}
function forumTopic(value:string):number|null {
  try {const u=new URL(value);if(u.protocol!=='https:'||u.hostname!==EVIDENCE_CONFIG.forum.host||u.username||u.password||(u.port&&u.port!=='443')||u.search||u.hash)return null;
    const m=/^\/t\/(?:[^/]+\/)?(\d+)(?:\.json)?\/?$/.exec(u.pathname);return m&&Number.isSafeInteger(Number(m[1]))?Number(m[1]):null;
  }catch{return null;}
}
export function approvedEvidenceCandidate(value:string){return approvedPrimaryUrl(value)||forumTopic(value)!==null;}
export function validatedPrimaryMaterial(m:Material) {
  if(approvedPrimaryUrl(m.url))return true;
  const id=forumTopic(m.url),f=m.forumIdentity;
  return id!==null&&m.role==='official_forum_statement'&&!!f&&f.topicId===id&&f.username==='Arbitrum'&&f.userId===7&&f.categoryId===52&&f.postNumber===1;
}
function tokens(value:string):Set<string> {
  const out=new Set<string>();for(const word of value.toLowerCase().match(/[a-z0-9]{3,}|[\p{Script=Han}]+/gu)??[]){
    if(/\p{Script=Han}/u.test(word)){for(let i=0;i<word.length-1;i++)out.add(word.slice(i,i+2));}
    else if(!['https','www','com','org','gov','the','and','for','with','from','news','press','releases'].includes(word))out.add(word);
  }return out;
}
/** Stable relevance ordering over original anchors, never generated/search links. */
export function originalPrimaryLinks(bodyHtml:string|null,originalUrl:string,context?:{title?:string;copy?:{titleZh?:string|null;summaryZh?:string|null;reasonZh?:string|null}}):string[]{
  const $=load(bodyHtml??''),candidates:Array<{url:string;score:number;index:number}>=[],seen=new Set<string>();
  const title=tokens(context?.title??''),copy=tokens([context?.copy?.titleZh,context?.copy?.summaryZh,context?.copy?.reasonZh].filter(Boolean).join(' '));
  for(const [index,anchor]of $('a[href]').toArray().entries())try{
    const url=new URL($(anchor).attr('href')!,originalUrl).toString();if(!approvedEvidenceCandidate(url)||seen.has(url))continue;seen.add(url);
    const words=tokens(`${$(anchor).text()} ${decodeURIComponent(new URL(url).pathname)}`);let score=0;for(const word of words){if(title.has(word))score+=3;if(copy.has(word))score+=2;}
    candidates.push({url,score,index});
  }catch{}
  return candidates.sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,EVIDENCE_CONFIG.maxMaterials).map(c=>c.url);
}
export const promptMaterials=(materials:readonly Material[])=>materials.map(m=>{const {bodyText,...metadata}=m;return {...metadata,quotes:materialQuotes(m)};});
export async function fetchPrimaryMaterialWithDiagnostic(url:string,fetcher:typeof guardedFetch=guardedFetch):Promise<EvidenceResult>{
  const result=(diagnostic:EvidenceDiagnostic,material:Material|null=null):EvidenceResult=>({url,diagnostic,material});
  if(!approvedEvidenceCandidate(url))return result('unsupported_entry');
  const topicId=forumTopic(url),jsonUrl=topicId!==null?`https://${EVIDENCE_CONFIG.forum.host}/t/${topicId}.json`:null;
  const approved=(value:string)=>jsonUrl!==null?value===jsonUrl:approvedPrimaryUrl(value);
  let next=jsonUrl??url;const deadline=Date.now()+EVIDENCE_CONFIG.deadlineMs;
  try{for(let hop=0;hop<=EVIDENCE_CONFIG.maxRedirects;hop++){
    if(!approved(next)||Date.now()>=deadline)return result('fetch_failed');
    const response=await fetcher(next,{timeoutMs:Math.max(1,deadline-Date.now()),maxBytes:EVIDENCE_CONFIG.maxBytes,maxRedirects:0,followRedirects:false});
    if(response.status>=300&&response.status<400&&response.headers.get('location')){next=new URL(response.headers.get('location')!,next).toString();continue;}
    if(!approved(response.url)||response.status!==200||response.body.length>EVIDENCE_CONFIG.maxBytes)return result('fetch_failed');
    if(topicId!==null){
      let data: {id:number;category_id:number;post_stream?:{posts?:Array<{post_number:number;username:string;user_id:number;cooked:string}>}};
      try{data=JSON.parse(response.text());}catch{return result('identity_mismatch');}
      const first=data.post_stream?.posts?.[0];
      if(data.id!==topicId||data.category_id!==52||first?.post_number!==1||first.username!=='Arbitrum'||first.user_id!==7||typeof first.cooked!=='string')return result('identity_mismatch');
      const $=load(first.cooked);$('script,style,iframe').remove();const text=$('body').text().trim();if(!text)return result('body_unreadable');
      return result('fetched',{id:`primary:arbitrum:${topicId}`,url,bodyText:text,primary:true,role:'official_forum_statement',forumIdentity:{topicId,username:'Arbitrum',userId:7,categoryId:52,postNumber:1}});
    }
    const type=response.headers.get('content-type')??'';let text:string|null=null;
    if(/application\/pdf/i.test(type)){text=await extractPdfEvidence(response.body,{deadlineMs:Math.max(1,Math.min(PDF_EVIDENCE_LIMITS.deadlineMs,deadline-Date.now()))});if(!text)return result('pdf_unreadable');}
    else if(/(?:text\/html|application\/xhtml)/i.test(type))text=readable(response.text(),response.url)?.text??null;
    if(!text)return result('body_unreadable');
    return result('fetched',{id:`primary:${sha256(response.url).slice(0,20)}`,url:response.url,bodyText:text,primary:true,role:'official_document'});
  }}catch{return result('fetch_failed');}
  return result('fetch_failed');
}
export async function fetchPrimaryMaterial(url:string,fetcher:typeof guardedFetch=guardedFetch):Promise<Material|null>{return (await fetchPrimaryMaterialWithDiagnostic(url,fetcher)).material;}
