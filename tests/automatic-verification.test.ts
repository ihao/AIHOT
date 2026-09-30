import { stub, tag, gate } from './setup.ts';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { config } from '../packages/backend/src/config.ts';
import { sql, closeDb } from '../packages/backend/src/db.ts';
import { upsertMaterial } from '../packages/backend/src/content/materials.ts';
import { setSourceAutoPublic } from '../packages/backend/src/editorial/review.ts';
import { verifyAutomaticArticle, queueAutomaticVerificationTx } from '../packages/backend/src/editorial/automatic-verification.ts';
import { considerAutoPublicationTx } from '../packages/backend/src/editorial/auto-publication.ts';
import { publishArticleTx } from '../packages/backend/src/publication/publish.ts';
import { invalidateStoryCurationTx } from '../packages/backend/src/events/eligibility.ts';
import { stopBoss, enqueue, QUEUES } from '../packages/backend/src/jobs/queue.ts';
import { analyzeArticle } from '../packages/backend/src/editorial/analyze.ts';
import { fetchItemsByIds } from '../packages/backend/src/publication/items.ts';
import { groupArticle } from '../packages/backend/src/events/group.ts';
import { mergeStoryInto } from '../packages/backend/src/events/merge.ts';
import { getReviewProposal } from '../packages/backend/src/editorial/review.ts';
import { decideArticleReview } from '../packages/backend/src/editorial/decision.ts';
import { loadStoryDetail, v1Story, loadHot } from '../packages/backend/src/publication/stories.ts';
import { composeStoryDigest } from '../packages/backend/src/events/digest.ts';
import { computeHotRanking } from '../packages/backend/src/events/hot.ts';
import { randomUUID } from 'node:crypto';
import { invalidateModelCache } from '../packages/backend/src/editorial/models.ts';
const T = tag(),
  source = `verify-${T}`;
const body = 'Bitcoin Core 30.1 is available. This maintenance release updates the Bitcoin client. ' + 'Documentation describes software improvements and supported operating systems. '.repeat(5);
let serial = 0,
  verdict = 'supported',
  quote = body.slice(0, 35),
  invalidJson = false;
let scoreAnswers: number[] = [];
const checks = {
  claimsComplete: true,
  chineseCopyFaithful: true,
  subject: true,
  numbers: true,
  units: true,
  time: true,
  chain: true,
  stage: true,
  attribution: true,
  noSpeculationAsFact: true,
  notMarketing: true
};
let verdicts: string[] = [],
  hold: ReturnType<typeof gate> | null = null,
  asked = gate();
const provider = await stub(async (_n, req) => {
  const request = JSON.parse(req.body),
    system = String(request.messages[0]?.content),
    userText = request.messages.at(-1).content;
  const answer = (data: unknown) => ({ choices: [{ message: { content: JSON.stringify(data) } }] });
  if (system.includes('宽召回的 Web3 相关性预筛')) return answer({ label: 'PASS', reason: '本机筛选' });
  if (system.includes('事件注意力评分器')) return answer({ attentionScore: scoreAnswers.shift() ?? 75 });
  if (system.includes('内容理解编辑')) return answer({ itemType: 'protocol_upgrade', authorRole: 'principal', tags: [], editorialJudgment: '维护发布', titleZh: 'Bitcoin Core 新软件版本发布', summaryZh: 'Bitcoin Core 宣布新版客户端可用。' });
  if (system.includes('资料结构化助手')) return answer({ category: 'infrastructure', tags: [], subjects: [], fact: null });
  if (system.includes('依据已抓取材料修正')) return {
    choices: [{
      message: {
        content: JSON.stringify({
          titleZh: 'Bitcoin Core 新软件版本发布',
          summaryZh: 'Bitcoin Core 发布了常规客户端软件版本。',
          reasonZh: null,
          category: 'infrastructure'
        })
      }
    }]
  };
  if (!String(userText).startsWith('{')) return {
    choices: [{
      message: {
        content: JSON.stringify({
          query: '发布',
          decisions: [...String(userText).matchAll(/【候选 (C\d+)】/g)].map(m => ({
            id: m[1],
            relation: 'UNRELATED',
            confidence: 0.99,
            note: ''
          })),
          a: '发布',
          b: '发布',
          relation: 'UNRELATED',
          difference: '',
          confidence: 0.99
        })
      }
    }]
  };
  const user = JSON.parse(userText),
    currentVerdict = verdicts.shift() ?? verdict;
  asked.open();
  if (hold) await hold.promise;
  const material = user.materials.find((m: {
    primary: boolean;
  }) => m.primary) ?? user.materials[0];
  return {
    choices: [{
      message: {
        content: invalidJson ? 'invalid-json' : JSON.stringify({
          verdict: currentVerdict,
          claims: [{
            claim: user.copy.titleZh,
            verdict: currentVerdict,
            evidence: currentVerdict === 'supported' ? [{
              materialId: material.id,
              exactQuote: quote
            }] : [],
            reason: '本机证据'
          }],
          checks,
          riskFlags: [],
          reason: '本机证据'
        })
      }
    }],
    usage: {
      prompt_tokens: 1,
      completion_tokens: 1
    }
  };
});
Object.assign(process.env, {
  LLM_BASE_URL: `${provider.url}/v1`,
  LLM_API_KEY: 'test-local-key',
  LLM_MODEL: 'qwen3.8-flash',
  VERIFICATION_MODEL: 'default',
  PREFILTER_MODEL: 'default', SCORE_MODEL: 'default', STRUCTURE_MODEL: 'default',
  UNDERSTAND_MODEL: 'default',
  GROUP_MODEL: 'default',
  GROUP_REVIEW_MODEL: 'default',
  EMBEDDINGS_ENABLED: 'false'
});
invalidateModelCache();
const originalFetch=globalThis.fetch;
globalThis.fetch=(request,init)=>{
 const url=new URL(typeof request==='string'?request:request instanceof URL?request.href:request.url);
 assert.equal(url.hostname,'127.0.0.1','model integration tests may only use the local provider stub');
 return originalFetch(request,init);
};
const oldMode = config.editorialMode,
  oldCalls = config.modelCallsEnabled;
config.editorialMode = 'automatic';
config.modelCallsEnabled = true;
let budgets: Array<{
  service: string;
  per_minute: number;
  per_hour: number;
  per_day: number;
}>;
before(async () => {
  budgets = await sql`SELECT service,per_minute,per_hour,per_day FROM budgets WHERE service='llm'`;
  await sql`UPDATE budgets SET per_minute=1000,per_hour=10000,per_day=100000 WHERE service='llm'`;
  await sql`INSERT INTO sources (id,name,kind,config,tier,participation_mode,first_party,next_fetch_at) VALUES (${source},'Synthetic primary','rss',${sql.json({
    feedUrl: 'https://bitcoincore.org/rss'
  })},'T1','editorial',true,'2100-01-01')`;
  await setSourceAutoPublic(source, {
    enabled: true,
    version: 0,
    reason: 'synthetic'
  }, 'test');
});
after(async () => {
  globalThis.fetch=originalFetch;
  config.editorialMode = oldMode;
  config.modelCallsEnabled = oldCalls;
  for (const b of budgets) await sql`UPDATE budgets SET per_minute=${b.per_minute},per_hour=${b.per_hour},per_day=${b.per_day} WHERE service=${b.service}`;
  await provider.close();
  await stopBoss();
  await closeDb();
});
async function article(opts: {
  relevance?: string;
  bodyStatus?: string;
  scores?: number[];
  selected?: boolean;
  bodyHtml?: string;
  sourceId?: string;
  title?: string;
  summary?: string;
} = {}) {
  const {
    articleId: id
  } = await upsertMaterial({
    sourceId: opts.sourceId ?? source,
    url: `https://bitcoincore.org/${T}/${++serial}`,
    title: opts.title ?? 'Bitcoin Core release',
    bodyText: body,
    bodyHtml: opts.bodyHtml,
    bodyStatus: (opts.bodyStatus ?? 'ok') as 'ok',
    via: 'fetch'
  });
  await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected,output) VALUES(${id},1,'model',${opts.relevance ?? 'pass'},'infrastructure','Bitcoin Core 新软件版本发布',${opts.summary ?? 'Bitcoin Core 宣布新版客户端可用。'},75,${opts.selected??true},${sql.json({
    scores: opts.scores ?? [75, 76],
    threshold: 60,
    itemType: 'protocol_upgrade',
    authorRole: 'principal',
    writer: 'understand'
  })})`;
  await sql`UPDATE articles SET processing_state='analyzed',grouped_at=now() WHERE id=${id}`;
  await sql.begin(tx => queueAutomaticVerificationTx(tx, id));
  return id;
}
async function projection(id: string) {
  return sql.begin(async tx => {
    await tx`SELECT id FROM articles WHERE id=${id} FOR UPDATE`;
    await considerAutoPublicationTx(tx, id);
    await publishArticleTx(tx, id);
    return (await tx<{
      visibility: string;
      selected: boolean;
      indexable: boolean;
    }[]>`SELECT visibility,selected,indexable FROM publications WHERE article_id=${id}`)[0]!;
  });
}
async function unanalyzedArticle(bodyHtml?: string) {
  return (await upsertMaterial({ sourceId: source, url: `https://bitcoincore.org/${T}/${++serial}`, title: 'Bitcoin Core release', bodyText: body, bodyHtml, bodyStatus: 'ok', via: 'fetch' })).articleId;
}
test('normal analysis replay preserves accepted authority and its analysis identity', async () => {
  const id = await unanalyzedArticle();
  const first = await analyzeArticle(id);
  await verifyAutomaticArticle(id);
  const replay = await analyzeArticle(id);
  assert.equal(replay!.analysisId, first!.analysisId);
  await verifyAutomaticArticle(id);
  assert.equal((await projection(id)).selected, true);
  const [round] = await sql`SELECT status,verification_count FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(round!.status, 'accepted');
  assert.equal(round!.verification_count, 1);
});
test('normal analysis replay leaves a pending verification runnable', async () => {
  const id = await unanalyzedArticle();
  const first = await analyzeArticle(id);
  const [replay, simultaneous] = await Promise.all([analyzeArticle(id), analyzeArticle(id)]);
  assert.equal(replay!.analysisId, first!.analysisId);
  assert.equal(simultaneous!.analysisId, first!.analysisId);
  const [count] = await sql`SELECT count(*)::int AS n FROM analyses WHERE article_id=${id}`;
  assert.equal(count!.n, 1);
  await verifyAutomaticArticle(id);
  assert.equal((await projection(id)).visibility, 'public');
});
test('normal analysis replay retains a noninteger three-score mean without creating a new result', async () => {
  const id = await unanalyzedArticle();
  scoreAnswers = [59, 80, 75];
  const first = await analyzeArticle(id);
  assert.deepEqual(first!.output!.scores, [59, 80, 75]);
  assert.equal(first!.output!.score, 71);
  await verifyAutomaticArticle(id);
  const replay = await analyzeArticle(id);
  assert.equal(replay!.analysisId, first!.analysisId);
  assert.equal(replay!.output!.scoreRange.mean, 214 / 3);
  assert.equal((await projection(id)).visibility, 'public');
});
test('a changed paid response is a new analysis result even on an ordinary attempt', async () => {
  const id = await unanalyzedArticle();
  const first = await analyzeArticle(id);
  await verifyAutomaticArticle(id);
  await sql`UPDATE receipts SET response=jsonb_set(response,'{choices,0,message,content}',${sql.json(JSON.stringify({ attentionScore: 74 }))}) WHERE id=${first!.receiptIds[1]!}`;
  const changed = await analyzeArticle(id);
  assert.notEqual(changed!.analysisId, first!.analysisId);
  assert.deepEqual(changed!.output!.scores, [74, 75]);
  assert.equal((await projection(id)).visibility, 'withdrawn');
});
test('normal analysis replay never overwrites the verified rewritten final copy', async () => {
  const id = await unanalyzedArticle('<a href="https://blog.ethereum.org/proof">official</a>');
  const first = await analyzeArticle(id);
  verdicts = ['needs_evidence', 'contradicted', 'supported'];
  await verifyAutomaticArticle(id, { fetchMaterial: async url => ({ id: 'replay-proof', url, bodyText: body, primary: true }) });
  const replay = await analyzeArticle(id);
  assert.equal(replay!.analysisId, first!.analysisId);
  const [latest] = await sql`SELECT summary_zh FROM analyses WHERE article_id=${id} ORDER BY id DESC LIMIT 1`;
  assert.equal(latest!.summary_zh, 'Bitcoin Core 发布了常规客户端软件版本。');
  assert.equal(replay!.output!.summaryZh, latest!.summary_zh);
  assert.equal((await projection(id)).visibility, 'public');
});
test('an explicit analysis attempt still creates a new result and closes old authority', async () => {
  const id = await unanalyzedArticle();
  const first = await analyzeArticle(id);
  await verifyAutomaticArticle(id);
  const explicit = await analyzeArticle(id, { attemptTag: 'explicit-review' });
  assert.notEqual(explicit!.analysisId, first!.analysisId);
  await verifyAutomaticArticle(id);
  assert.equal((await projection(id)).visibility, 'withdrawn');
});
test('automatic grouping jobs allow two retries while manual jobs retain four', async () => {
  const automatic = await enqueue(QUEUES.group, { articleId: `auto-retry-${T}` }, { singletonKey: `auto-retry-${T}` });
  config.editorialMode = 'manual';
  let manual: string | null;
  try { manual = await enqueue(QUEUES.group, { articleId: `manual-retry-${T}` }, { singletonKey: `manual-retry-${T}` }); }
  finally { config.editorialMode = 'automatic'; }
  const jobs = await sql`SELECT id,retry_limit FROM pgboss.job WHERE id IN (${automatic},${manual!})`;
  assert.equal(jobs.find(j => j.id === automatic)!.retry_limit, 2);
  assert.equal(jobs.find(j => j.id === manual)!.retry_limit, 4);
});
test('missing verification cannot grant automatic visibility or selection', async () => {
  const id = await article();
  assert.equal((await projection(id)).visibility, 'withdrawn');
});
test('real local verifier grants publication, selection and indexing; membership invalidation restores without paid requests', async () => {
  const id = await article();
  await verifyAutomaticArticle(id);
  assert.deepEqual(await projection(id), {
    visibility: 'public',
    selected: true,
    indexable: true
  });
  const hits = provider.hits();
  await sql.begin(async tx => {
    await tx`SELECT id FROM articles WHERE id=${id} FOR UPDATE`;
    await invalidateStoryCurationTx(tx, id);
    await publishArticleTx(tx, id);
  });
  assert.equal((await projection(id)).selected, true);
  assert.equal(provider.hits(), hits);
});
test('UNKNOWN and unreadable original remain private', async () => {
  for (const opts of [{
    relevance: 'unknown'
  }, {
    bodyStatus: 'unconfirmed'
  }]) {
    const id = await article(opts);
    await verifyAutomaticArticle(id);
    assert.equal((await projection(id)).visibility, 'withdrawn');
  }
});
test('fake quotes exhaust a round once; new analysis ID cannot restart terminal verification', async () => {
  const id = await article();
  quote = 'model invented quote';
  await verifyAutomaticArticle(id);
  quote = body.slice(0, 35);
  const [round] = await sql<{
    status: string;
    verification_count: number;
  }[]>`SELECT status,verification_count FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(round!.status, 'rejected');
  assert.ok(round!.verification_count <= 3);
  const hits = provider.hits();
  await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected,output) SELECT article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected,output FROM analyses WHERE article_id=${id} ORDER BY id DESC LIMIT 1`;
  await sql.begin(tx => queueAutomaticVerificationTx(tx, id));
  await verifyAutomaticArticle(id);
  assert.equal(provider.hits(), hits);
  assert.equal((await projection(id)).visibility, 'withdrawn');
});
test('verified grant is bound to copy and revision; override withdrawal never restores', async () => {
  const id = await article();
  await verifyAutomaticArticle(id);
  await sql`UPDATE analyses SET summary_zh='损失金额一百万美元已确认。' WHERE article_id=${id}`;
  assert.equal((await projection(id)).visibility, 'withdrawn');
  const other = await article();
  await verifyAutomaticArticle(other);
  await sql`INSERT INTO editorial_overrides(article_id,fields,visibility) VALUES(${other},'{}','withdrawn')`;
  await sql.begin(async tx => {
    await tx`SELECT id FROM articles WHERE id=${other} FOR UPDATE`;
    await invalidateStoryCurationTx(tx, other);
  });
  assert.equal((await projection(other)).visibility, 'withdrawn');
});
test('three actual failed verifier requests exhaust a round, with no fourth request on recovery', async () => {
  const id = await article();
  invalidJson = true;
  const hits = provider.hits();
  for (let i = 0; i < 4; i++) {
    await sql`UPDATE automatic_verifications SET retry_at=NULL WHERE article_id=${id}`;
    await assert.rejects(verifyAutomaticArticle(id)).catch(() => {});
  }
  invalidJson = false;
  const [round] = await sql<{
    status: string;
    verification_count: number;
  }[]>`SELECT status,verification_count FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(provider.hits() - hits, 3);
  assert.equal(round!.verification_count, 3);
  assert.equal(round!.status, 'rejected');
});
test('source policy context or original-body edits cannot regrant an old verified round', async () => {
  const id = await article();
  await verifyAutomaticArticle(id);
  await sql`UPDATE sources SET first_party=false WHERE id=${source}`;
  assert.equal((await projection(id)).visibility, 'withdrawn');
  await sql`UPDATE sources SET first_party=true WHERE id=${source}`;
  const other = await article();
  await verifyAutomaticArticle(other);
  await sql`UPDATE articles SET body_text=body_text||' Changed unversioned original fact.' WHERE id=${other}`;
  assert.equal((await projection(other)).visibility, 'withdrawn');
});
test('first grouping, forced regroup and merge restore automatic selection; reader event text uses verified copy', async () => {
  const id = await article();
  await verifyAutomaticArticle(id);
  const [before] = await sql<{
    n: number;
  }[]>`SELECT count(*)::int AS n FROM receipt_attempts ra JOIN receipts r ON r.id=ra.receipt_id WHERE r.subject=${`article:${id}@1`} AND r.purpose='verify_summary'`;
  const first = await groupArticle(id);
  assert.ok(first.storyId);
  assert.equal((await projection(id)).selected, true);
  const regroup = await groupArticle(id, {
    force: true
  });
  assert.ok(regroup.storyId);
  assert.equal((await projection(id)).selected, true);
  const [target] = await sql<{
    id: number;
  }[]>`INSERT INTO stories(public_id,title,digest,summary,first_report_at,latest_at) VALUES(${randomUUID()},'未经核验的事件标题','未经核验的故事综述','未经核验的事件摘要',now(),now()) RETURNING id`;
  await mergeStoryInto(regroup.storyId!, target!.id, 'synthetic merge', 'test');
  assert.equal((await projection(id)).selected, true);
  const [after] = await sql<{
    n: number;
  }[]>`SELECT count(*)::int AS n FROM receipt_attempts ra JOIN receipts r ON r.id=ra.receipt_id WHERE r.subject=${`article:${id}@1`} AND r.purpose='verify_summary'`;
  assert.equal(after!.n, before!.n);
  const detail = await loadStoryDetail(target!.id);
  const api = await v1Story(target!.id);
  assert.ok(detail);
  assert.ok(api);
  const item=(await fetchItemsByIds([id])).get(id)!;
  assert.equal(item.story_title,'Bitcoin Core 新软件版本发布');
  assert.ok(item.story_public_id);
  assert.equal(detail!.title, 'Bitcoin Core 新软件版本发布');
  assert.equal(detail!.digest, null);
  assert.equal(api!.story.digest, null);
  assert.ok(!JSON.stringify([detail, api]).includes('未经核验'));
});
test('evidence then contradiction rewrite consume three verifier requests and preserve final copy authority', async () => {
  const id = await article({
    bodyHtml: '<p>Evidence <a href="https://blog.ethereum.org/proof">official</a></p>'
  });
  verdicts = ['needs_evidence', 'contradicted', 'supported'];
  let fetched = 0;
  await verifyAutomaticArticle(id, {
    fetchMaterial: async url => {
      fetched++;
      return {
        id: 'official-proof',
        url,
        bodyText: body,
        primary: true
      };
    }
  });
  const [r] = await sql<{
    verification_count: number;
    status: string;
    rewritten: boolean;
    final_copy: {
      summaryZh: string;
    };
    final_fingerprint: string;
  }[]>`SELECT verification_count,status,rewritten,final_copy,final_fingerprint FROM automatic_verifications WHERE article_id=${id}`;
  assert.equal(r!.verification_count, 3);
  assert.equal(r!.status, 'accepted');
  assert.equal(r!.rewritten, true);
  assert.equal(fetched, 1);
  assert.equal(r!.final_copy.summaryZh, 'Bitcoin Core 发布了常规客户端软件版本。');
  assert.equal((await getReviewProposal(id))!.fingerprint, r!.final_fingerprint);
  assert.equal((await projection(id)).selected, true);
});
test('concurrent workers share a persisted claim and never duplicate a verifier request', async () => {
  const id = await article();
  hold = gate();
  asked = gate();
  const hits = provider.hits();
  const first = verifyAutomaticArticle(id);
  await asked.promise;
  await verifyAutomaticArticle(id);
  hold.open(undefined);
  hold = null;
  await first;
  assert.equal(provider.hits() - hits, 1);
  assert.equal((await projection(id)).visibility, 'public');
});
test('explicit rejection and a stale original revision cannot recover automatic publication', async () => {
  const id = await article();
  await verifyAutomaticArticle(id);
  const p = await getReviewProposal(id);
  const [r] = await sql<{
    version: number;
  }[]>`SELECT version FROM editorial_reviews WHERE article_id=${id}`;
  await decideArticleReview(id, {
    status: 'rejected',
    fingerprint: p!.fingerprint,
    version: r!.version,
    reason: 'explicit human hold'
  }, 'test');
  await sql.begin(tx => invalidateStoryCurationTx(tx, id));
  assert.equal((await projection(id)).visibility, 'withdrawn');
  const other = await article();
  await verifyAutomaticArticle(other);
  await sql`UPDATE articles SET revision=revision+1 WHERE id=${other}`;
  assert.equal((await projection(other)).visibility, 'withdrawn');
});
test('automatic publication exposes summary and original link even if a legacy source carries fulltext flags', async () => {
  await sql`UPDATE sources SET site_fulltext=true,syndicate_fulltext=true WHERE id=${source}`;
  const id = await article();
  await verifyAutomaticArticle(id);
  const [p] = await sql<{
    body_mode: string;
    syndicate: boolean;
  }[]>`SELECT body_mode,syndicate FROM publications WHERE article_id=${id}`;
  await sql`UPDATE sources SET site_fulltext=false,syndicate_fulltext=false WHERE id=${source}`;
  assert.equal(p!.body_mode, 'summary');
  assert.equal(p!.syndicate, false);
});
test('automatic hot readers replace historical ranking text and cached withdrawn representative summaries', async () => {
  const sourceIds = [source, `${source}-hot2`, `${source}-hot3`];
  for (const next of sourceIds.slice(1)) {
    await sql`INSERT INTO sources(id,name,kind,config,tier,participation_mode,first_party,next_fetch_at) VALUES(${next},${next},'rss','{}','T1','editorial',true,'2100-01-01')`;
    await setSourceAutoPublic(next, {
      enabled: true,
      version: 0,
      reason: 'synthetic hot evidence'
    }, 'test');
  }
  const [story] = await sql<{
    id: number;
  }[]>`INSERT INTO stories(public_id,title,first_report_at,latest_at) VALUES(${randomUUID()},'未经核验的事件生成标题',now(),now()) RETURNING id`;
  const ids: string[] = [];
  for (const [index, sid] of sourceIds.entries()) {
    const id = await article({
      sourceId: sid,
      summary: index === 2 ? 'Bitcoin Core 发布维护版本并更新受支持的操作系统。' : 'Bitcoin Core 宣布新版客户端可用。'
    });
    ids.push(id);
    await verifyAutomaticArticle(id);
    await sql.begin(async tx => {
      await tx`SELECT id FROM articles WHERE id=${id} FOR UPDATE`;
      const [fact] = await tx<{
        id: number;
      }[]>`INSERT INTO facts(public_id,story_id,title) VALUES(${`hot-${T}-${index}`},${story!.id},'未核验事实标题') RETURNING id`;
      await tx`INSERT INTO fact_articles(fact_id,article_id,role) VALUES(${fact!.id},${id},'report')`;
      await tx`INSERT INTO story_signals(story_id,article_id,participant_key,source_id,kind,observed_at) VALUES(${story!.id},${id},${`source:${sid}`},${sid},'editorial',now())`;
      await invalidateStoryCurationTx(tx, id);
      await publishArticleTx(tx, id);
    });
  }
  const ranking = await computeHotRanking();
  await sql`UPDATE hot_rankings SET entries=(SELECT jsonb_agg(CASE WHEN (e->>'storyId')::bigint=${story!.id} THEN e||jsonb_build_object('title','未经核验的热榜快照标题','representativeItemId',${ids[2]}::text) ELSE e END) FROM jsonb_array_elements(entries)e) WHERE id=${ranking.id}`;
  const warm = await loadHot();
  assert.ok(warm.entries.some(e => e.story.publicId));
  await sql`INSERT INTO editorial_overrides(article_id,fields,visibility) VALUES(${ids[2]},'{}','withdrawn')`;
  await projection(ids[2]!);
  const current = JSON.stringify(await loadHot());
  assert.ok(!current.includes('未经核验'));
  assert.ok(!current.includes('发布维护版本并更新受支持的操作系统'));
});

test('automatic event digest skips the unused paid generation step',async()=>{
 const id=await article();await verifyAutomaticArticle(id);const grouped=await groupArticle(id);assert.ok(grouped.storyId);
 const enabled=config.modelCallsEnabled;config.modelCallsEnabled=false;
 try {assert.deepEqual(await composeStoryDigest(grouped.storyId!),{updated:false});}finally{config.modelCallsEnabled=enabled;}
});

test('current automatic score and verification decision supplies selection authority',async()=>{
 const id=await article({selected:false});await verifyAutomaticArticle(id);assert.equal((await projection(id)).selected,true);
});
