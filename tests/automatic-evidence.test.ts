import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approvedPrimaryUrl, originalPrimaryLinks, fetchPrimaryMaterial, requiresPrimaryEvidence, deterministicCopyConflicts } from '../packages/backend/src/editorial/automatic-verification.ts';
import * as automaticVerification from '../packages/backend/src/editorial/automatic-verification.ts';
test('the corrected currency guard has its own version and invalidates the previous deployed rule', () => {
  assert.ok('AUTOMATIC_AMOUNT_GUARD_VERSION' in automaticVerification, 'deterministic amount semantics must be explicitly versioned');
  assert.equal(automaticVerification.AUTOMATIC_AMOUNT_GUARD_VERSION, 'currency-amounts-v2');
  assert.notEqual(automaticVerification.AUTOMATIC_RULE_VERSION, 'automatic-publication-v1:2212ca55bcc7250900bfebde');
});
test('only two literal original first-party HTTPS evidence links are admitted', () => {
  assert.deepEqual(originalPrimaryLinks(`<a href="https://github.com/ethereum/fake">fake</a><a href="https://ethereum.org/a">a</a><a href='https://sec.gov/b'>b</a><a href="https://aave.com/c">c</a>`, 'https://panews.example/'), ['https://ethereum.org/a', 'https://sec.gov/b']);
  for (const url of ['https://ethereum.org.evil.test/a', 'https://evil.ethereum.org/a', 'https://user:secret@ethereum.org/a', 'http://ethereum.org/a', 'https://ethereum.org:8000/a', 'https://test.substack.com/a']) assert.equal(approvedPrimaryUrl(url), false, url);
});
test('approved protocol official evidence endpoints are exact hosts with bounded literal links', () => {
  for (const url of ['https://blog.chain.link/security-update','https://docs.compound.finance/v2/','https://www.fincen.gov/news','https://blog.celestia.org/fibre/']) {
    assert.equal(approvedPrimaryUrl(url),true,url);
  }
  for (const url of ['https://forum.compound.finance/thread','https://evil.docs.compound.finance/a','https://docs.compound.finance.evil.test/a','https://github.com/attacker/repo','https://medium.com/@attacker/a']) assert.equal(approvedPrimaryUrl(url),false,url);
  assert.deepEqual(originalPrimaryLinks('<a href=https://docs.compound.finance/v2/?a=1&amp;b=2>docs</a><a href="https://blog.chain.link/a">link</a><a href="https://www.fincen.gov/third">third</a>','https://example.com/'),
    ['https://docs.compound.finance/v2/?a=1&b=2','https://blog.chain.link/a']);
});
test('Compound official documentation migration admits its exact new host at each redirect hop',async () => {
  const requested:string[]=[];
  const fetcher=async(url:string)=>{
    requested.push(url);
    return {status:302,url,headers:new Headers({location:url.includes('compound.finance')?'https://docs.compound.xyz/v2/':'https://evil.example/a'}),body:Buffer.alloc(0),text:()=>''};
  };
  assert.equal(await fetchPrimaryMaterial('https://docs.compound.finance/v2/',fetcher),null);
  assert.deepEqual(requested,['https://docs.compound.finance/v2/','https://docs.compound.xyz/v2/']);
});
test('redirect outside approved first-party host is refused before it is fetched', async () => {
  const requested: string[] = [];
  const fetcher = async (url: string) => {
    requested.push(url);
    return {
      status: 302,
      url,
      headers: new Headers({
        location: 'https://evil.example/a'
      }),
      body: Buffer.alloc(0),
      text: () => ''
    };
  };
  assert.equal(await fetchPrimaryMaterial('https://ethereum.org/a', fetcher), null);
  assert.deepEqual(requested, ['https://ethereum.org/a']);
});
test('critical secondary reporting needs primary evidence even if the model returns empty flags', () => {
  assert.equal(requiresPrimaryEvidence({
    first_party: false,
    title: 'PANews reports attack losses',
    body_text: 'Confirmed losses',
    category: 'infrastructure',
    output: {
      itemType: 'protocol_upgrade'
    }
  }), true);
});
test('a claimed Chinese currency amount not in the material is a deterministic conflict', () => {
  assert.deepEqual(deterministicCopyConflicts({
    titleZh: '协议遭攻击损失一千万美元',
    summaryZh: '损失已确认',
    reasonZh: null,
    category: 'security'
  }, [{
    id: 'original',
    bodyText: 'The incident caused an estimated loss of $1 million.',
    primary: true
  }]), ['copy_amount_conflict']);
  assert.deepEqual(deterministicCopyConflicts({
    titleZh: '机构估计损失100万美元',
    summaryZh: '报告估计金额。',
    reasonZh: null,
    category: 'security'
  }, [{
    id: 'original',
    bodyText: 'The incident caused an estimated loss of $1 million.',
    primary: true
  }]), []);
});
test('matching Chinese literal money quantities are allowed', () => assert.deepEqual(deterministicCopyConflicts({
  titleZh: '估计损失一百万美元',
  summaryZh: '机构研究估计。',
  reasonZh: null,
  category: 'security'
}, [{
  id: 'original',
  bodyText: 'An estimated $1 million loss.',
  primary: true
}]), []));
test('spaces between a decimal coefficient and its Chinese currency scale preserve the exact amount', () => {
  for (const [claimed, original, expected] of [
    ['5938 亿美元', '$593.8 billion', []],
    ['2525 亿美元', '$252.5 billion', []],
    ['391 亿美元', '$39.1 billion', []],
    ['5938 亿 美元', '$593.8 billion', []],
    ['2 千万美元', '$20 million', []],
    ['1.2 万亿元', 'CNY 1.2 trillion', []],
    ['5939 亿美元', '$593.8 billion', ['copy_amount_conflict']],
    ['2525 亿美元', '$252.5 million', ['copy_amount_conflict']],
    ['391 亿元', '$39.1 billion', ['copy_amount_conflict']],
  ] as const) assert.deepEqual(deterministicCopyConflicts({
    titleZh: `研究估计${claimed}`, summaryZh: null, reasonZh: null, category: 'research',
  }, [{ id: 'original', bodyText: original, primary: true }]), expected, `${claimed} against ${original}`);
});
test('mixed Arabic and Chinese compound currency quantities retain their coefficient', () => {
  for (const [claimed, original, expected] of [
    ['2千万美元', '$10 million', ['copy_amount_conflict']],
    ['2百万美元', '$1 million', ['copy_amount_conflict']],
    ['2百万元', '人民币100万元', ['copy_amount_conflict']],
    ['2千万美元', '$20 million', []],
    ['2百万美元', '$2 million', []],
    ['2百万元', '人民币200万元', []],
    ['2百万元', '$2 million', ['copy_amount_conflict']],
    ['二千万美元', '$20 million', []],
    ['二百万美元', '$2 million', []],
    ['200万美元', '$2 million', []],
  ] as const) assert.deepEqual(deterministicCopyConflicts({
    titleZh: `研究估计损失${claimed}`, summaryZh: '估计金额。', reasonZh: null, category: 'security',
  }, [{ id: 'original', bodyText: `The estimated loss was ${original}.`, primary: true }]), expected, claimed);
});
test('trillion currency units preserve the composed ten-thousand times hundred-million scale', () => {
  for (const [claimed, original, expected] of [
    ['1万亿美元', '$10,000', ['copy_amount_conflict']],
    ['一万亿美元', '$10,000', ['copy_amount_conflict']],
    ['1.2万亿美元', '$12,000', ['copy_amount_conflict']],
    ['1万亿美元', '$1 trillion', []],
    ['一万亿美元', '$1 trillion', []],
    ['1.2万亿美元', '$1.2 trillion', []],
    ['1万亿元', '人民币10,000元', ['copy_amount_conflict']],
    ['一万亿元', '人民币10,000元', ['copy_amount_conflict']],
    ['1.2万亿元', '人民币12,000元', ['copy_amount_conflict']],
    ['1万亿元', 'CNY 1 trillion', []],
    ['一万亿元', 'CNY 1 trillion', []],
    ['1.2万亿元', 'CNY 1.2 trillion', []],
    ['10,000美元', 'An estimate of 1万亿美元', ['copy_amount_conflict']],
    ['1,000,000,000,000美元', 'An estimate of 一万亿美元', []],
    ['一亿二千万美元', '$120 million', []],
  ] as const) assert.deepEqual(deterministicCopyConflicts({
    titleZh: `研究估计${claimed}`, summaryZh: '估计金额。', reasonZh: null, category: 'infrastructure',
  }, [{ id: 'original', bodyText: original, primary: true }]), expected, `${claimed} against ${original}`);
});
test('English amount scales and currency names require complete tokens', () => {
  for (const [claimed, original, expected] of [
    ['10美元', '$10 total', []],
    ['10美元', '$10 to $20', []],
    ['10万亿美元', '$10 total', ['copy_amount_conflict']],
    ['10万亿美元', '$10 to $20', ['copy_amount_conflict']],
    ['100美元', '100 USDT', ['copy_amount_conflict']],
    ['100美元', '100 USDC', ['copy_amount_conflict']],
    ['100美元', '100USDToken', ['copy_amount_conflict']],
    ['100美元', '100 USD', []],
    ['一千万美元', '$10m', []],
    ['一千万美元', '$10million', []],
    ['10万亿美元', '$10 trillion', []],
  ] as const) assert.deepEqual(deterministicCopyConflicts({
    titleZh: `估计${claimed}`, summaryZh: '机构估计金额。', reasonZh: null, category: 'infrastructure',
  }, [{ id: 'original', bodyText: original, primary: true }]), expected, `${claimed} against ${original}`);
});
test('an approved redirect can yield a primary material using readable final HTTPS body', async () => {
  const requested: string[] = [];
  const fetcher = async (url: string) => {
    requested.push(url);
    return url.endsWith('/a') ? {
      status: 302,
      url,
      headers: new Headers({
        location: 'https://www.ethereum.org/b'
      }),
      body: Buffer.alloc(0),
      text: () => ''
    } : {
      status: 200,
      url,
      headers: new Headers({
        'content-type': 'text/html'
      }),
      body: Buffer.alloc(0),
      text: () => `<html><head><title>Release</title></head><body><article><h1>Ethereum update</h1><p>${'The foundation announced a planned testnet release and documented its activation schedule. '.repeat(8)}</p></article></body></html>`
    };
  };
  const material = await fetchPrimaryMaterial('https://ethereum.org/a', fetcher);
  assert.ok(material?.primary);
  assert.equal(material!.url, 'https://www.ethereum.org/b');
  assert.equal(requested.length, 2);
});
test('policy category and policy_event item type force primary evidence despite no literal risk words',()=>{
 assert.equal(requiresPrimaryEvidence({first_party:false,title:'A new order entered force',body_text:'The decision was issued yesterday.',category:'policy',output:{itemType:'policy_event'}}),true);
});
