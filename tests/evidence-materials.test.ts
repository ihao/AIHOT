import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approvedPrimaryUrl, originalPrimaryLinks, fetchPrimaryMaterial } from '../packages/backend/src/editorial/automatic-verification.ts';
const evidence = await import('../packages/backend/src/editorial/evidence-materials.ts').catch(() => null);
const pdf = await import('../packages/backend/src/editorial/pdf-evidence.ts').catch(() => null);
const response = (url: string, text: string, type = 'application/json') => ({ url, status: 200, headers: new Headers({'content-type':type}), body: Buffer.from(text), text:()=>text });

test('approved government and protocol hosts are exact, never shared forum permission', () => {
  for (const host of ['home.treasury.gov','ofac.treasury.gov','cftc.gov','federalregister.gov','reginfo.gov','docs.arbitrum.io']) assert.equal(approvedPrimaryUrl(`https://${host}/news`),true,host);
  for (const host of ['treasury.gov','forum.arbitrum.foundation','evil.cftc.gov','cftc.gov.evil.test']) assert.equal(approvedPrimaryUrl(`https://${host}/news`),false,host);
});
test('literal anchor relevance outranks unrelated official company backgrounds', () => {
  const html = '<a href="https://sec.gov/company">CEO appointment</a><a href="https://aave.com/company">recruiting</a><a href="https://home.treasury.gov/news/press-releases/x">Treasury sanctions crypto exchange</a><a href="https://ofac.treasury.gov/recent-actions/x">OFAC exchange sanctions</a>';
  assert.deepEqual(originalPrimaryLinks(html,'https://media.example/a',{title:'Treasury sanctions crypto exchange',copy:{titleZh:'财政部制裁加密交易所',summaryZh:'OFAC 宣布制裁交易所。'}}),['https://home.treasury.gov/news/press-releases/x','https://ofac.treasury.gov/recent-actions/x']);
});
test('Arbitrum primary material is only the verified matching official first post', async () => {
  assert.ok(evidence,'evidence-materials module exists');
  const url='https://forum.arbitrum.foundation/t/security-council-elections/31530';
  const topic={id:31530,category_id:52,post_stream:{posts:[{post_number:1,username:'Arbitrum',user_id:7,cooked:'<p>The Security Council election schedule was announced.</p>'},{post_number:2,username:'Arbitrum',user_id:7,cooked:'<p>Unrelated reply cannot support claims.</p>'}]}};
  const requested:string[]=[];
  const m=await evidence.fetchPrimaryMaterial(url,async target=>{requested.push(target);return response(target,JSON.stringify(topic));});
  assert.deepEqual(requested,['https://forum.arbitrum.foundation/t/31530.json']);
  assert.equal(m?.primary,true);assert.match(m!.bodyText,/election schedule/);assert.doesNotMatch(m!.bodyText,/Unrelated reply/);
  for (const mutation of [{id:31531},{category_id:51},{post_stream:{posts:[{...topic.post_stream.posts[0],username:'attacker'}]}},{post_stream:{posts:[{...topic.post_stream.posts[0],user_id:8}]}},{post_stream:{posts:[{...topic.post_stream.posts[0],post_number:2}]}}]) {
    assert.equal(await evidence.fetchPrimaryMaterial(url,async target=>response(target,JSON.stringify({...topic,...mutation}))),null);
  }
  assert.equal(await evidence.fetchPrimaryMaterial(`${url}/2`,async target=>response(target,JSON.stringify(topic))),null,'reply URL is not primary');
});
test('paragraph quotes are server numbered and bound to unchanged contiguous text', () => {
  assert.ok(evidence);
  const qs=evidence.materialQuotes({id:'primary:a',bodyText:'First “exact” paragraph.\n\nSecond paragraph.',primary:true});
  assert.deepEqual(qs,[{quoteId:'primary:a:p1',text:'First “exact” paragraph.'},{quoteId:'primary:a:p2',text:'Second paragraph.'}]);
});
function tinyPdf(text='Official evidence'):Buffer {
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${text.length+33} >>\nstream\nBT /F1 12 Tf 10 700 Td (${text}) Tj ET\nendstream`];
  let out='%PDF-1.4\n';const offsets=[0];for(const [i,obj]of objects.entries()){offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${obj}\nendobj\n`;}
  const start=Buffer.byteLength(out);out+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(out);
}
test('bounded isolated PDF extraction accepts text and refuses unreadable and resource limits', async () => {
  assert.ok(pdf,'isolated PDF parser exists');
  assert.match((await pdf.extractPdfEvidence(tinyPdf()))??'',/Official evidence/);
  assert.equal(await pdf.extractPdfEvidence(Buffer.from('not PDF')),null);
  assert.equal(await pdf.extractPdfEvidence(tinyPdf('')),null);
  assert.equal(await pdf.extractPdfEvidence(tinyPdf(),{maxBytes:2}),null);
  assert.equal(await pdf.extractPdfEvidence(tinyPdf(),{maxPages:0}),null);
  const twoPages=Buffer.from(tinyPdf().toString().replace('/Kids [3 0 R] /Count 1','/Kids [3 0 R 3 0 R] /Count 2'));
  assert.equal(await pdf.extractPdfEvidence(twoPages,{maxPages:1}),null);
  const encrypted=Buffer.from(tinyPdf().toString().replace('/Root 1 0 R','/Root 1 0 R /Encrypt << /Filter /Standard /V 4 /R 4 /Length 128 >>'));
  assert.equal(await pdf.extractPdfEvidence(encrypted),null);
  assert.equal(await pdf.extractPdfEvidence(tinyPdf(),{maxTextChars:2}),null);
  assert.equal(await pdf.extractPdfEvidence(tinyPdf(),{deadlineMs:1}),null);
});
test('PDF bytes are parsed only after every fetched host is approved',async()=>{
  assert.ok(pdf);
  const m=await fetchPrimaryMaterial('https://cftc.gov/order.pdf',async url=>({...response(url,'','application/pdf'),body:tinyPdf()}));
  assert.match(m?.bodyText??'',/Official evidence/);
  let calls=0;assert.equal(await fetchPrimaryMaterial('https://evil.example/order.pdf',async url=>{calls++;return response(url,'','application/pdf');}),null);assert.equal(calls,0);
});
test('model payload contains numbered paragraphs once without duplicating full material body',()=>{
 assert.ok(evidence);const text='First paragraph.\n\nSecond paragraph.';
 const payload=evidence.promptMaterials([{id:'original',url:'https://example.com/a',bodyText:text,primary:false}]);
 assert.equal('bodyText' in payload[0],false);assert.equal(payload[0].quotes.map(q=>q.text).join('\n\n'),text);
});
