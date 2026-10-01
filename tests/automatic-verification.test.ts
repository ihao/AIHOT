import { stub, tag, gate } from './setup.ts';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { config } from '../packages/backend/src/config.ts';
import { sql, closeDb } from '../packages/backend/src/db.ts';
import { upsertMaterial } from '../packages/backend/src/content/materials.ts';
import { setSourceAutoPublic } from '../packages/backend/src/editorial/review.ts';
import { AUTOMATIC_RULE_VERSION, verifyAutomaticArticle, queueAutomaticVerificationTx, sweepAutomaticVerifications } from '../packages/backend/src/editorial/automatic-verification.ts';
import { considerAutoPublicationTx } from '../packages/backend/src/editorial/auto-publication.ts';
import { refreshAutomaticSafety, sourcePauseUntil } from '../packages/backend/src/editorial/automatic-safety.ts';
import { publishArticleTx } from '../packages/backend/src/publication/publish.ts';
import { invalidateStoryCurationTx } from '../packages/backend/src/events/eligibility.ts';
import { stopBoss, enqueue, QUEUES } from '../packages/backend/src/jobs/queue.ts';
import { analyzeArticle, ANALYZE_PROMPT_VERSION } from '../packages/backend/src/editorial/analyze.ts';
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
import { promptText, promptVersion } from '../packages/backend/src/editorial/prompts.ts';
import { sha256 } from '../packages/backend/src/lib/ids.ts';
import { selectedSnapshot, selectedChanges } from '../packages/backend/src/publication/v1.ts';
import { loadItemShare } from '../packages/backend/src/publication/og.ts';
import { loadDevelopments } from '../packages/backend/src/publication/groups.ts';
import { processArticle } from '../packages/backend/src/jobs/content.ts';
import { buildApp } from '../apps/api/src/app.ts';
const T = tag(),
  source = `verify-${T}`;
const body = 'Bitcoin Core 30.1 is available. This maintenance release updates the Bitcoin client. ' + 'Documentation describes software improvements and supported operating systems. '.repeat(5);
let serial = 0,
  verdict = 'supported',
  quote = body.slice(0, 35),
  invalidJson = false;
let scoreAnswers: number[] = [];
let rewriteSummary: string | null = null;
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
          summaryZh: rewriteSummary ?? 'Bitcoin Core 发布了常规客户端软件版本。',
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
  publishedAt?: Date;
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
    via: 'fetch',
    publishedAt: opts.publishedAt
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
async function releasedLedgerClock() {
  const [latest] = await sql<{ at: Date | null }[]>`SELECT max(visible_at) AS at FROM selected_ledger`;
  return new Date(Math.max(Date.now(), latest?.at?.getTime() ?? 0) + 1);
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
  const receipts = await sql<{ request: { promptVersion: string; systemHash: string } }[]>`
    SELECT request FROM receipts WHERE purpose='rewrite_verified_summary' AND subject=${`article:${id}@1`}`;
  assert.equal(receipts.length, 1, 'only one rewrite is allowed for this round');
  assert.match(receipts[0]!.request.promptVersion, /^rewrite-verified-summary@/);
  assert.equal(receipts[0]!.request.promptVersion, promptVersion('rewrite-verified-summary'));
  assert.equal(receipts[0]!.request.systemHash, sha256(promptText('rewrite-verified-summary')));
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

test('an obsolete accepted automatic rule closes every public exit before asynchronous recovery', async () => {
  const snapshotBefore = await selectedSnapshot({ limit: 5000, page: null }, await releasedLedgerClock());
  const id = await article();
  await verifyAutomaticArticle(id);
  const grouped = await groupArticle(id);
  const [story] = await sql<{ public_id: string }[]>`SELECT public_id::text FROM stories WHERE id=${grouped.storyId!}`;
  const app = await buildApp();
  try {
    assert.equal((await app.inject({ url: `/api/site/items/${id}` })).statusCode, 200);
    assert.ok(JSON.stringify(await selectedSnapshot({ limit: 5000, page: null }, await releasedLedgerClock())).includes(id));
    await app.inject({ url: '/api/site/timeline' }); // warm the grouped anchors before authority changes
    await sql`UPDATE automatic_verifications SET automatic_rule_version=${`obsolete:${AUTOMATIC_RULE_VERSION}`} WHERE article_id=${id}`;
    const [stored] = await sql`SELECT visibility,selected FROM publications WHERE article_id=${id}`;
    assert.equal(stored!.visibility, 'public');
    assert.equal(stored!.selected, true, 'the fixture intentionally retains its old public projection');
    const hits = provider.hits();
    await sql`UPDATE editorial_reviews SET status='pending' WHERE article_id=${id}`;
    assert.equal((await app.inject({ url: `/api/site/items/${id}` })).statusCode, 404, 'pending review does not erase automatic provenance');
    await sql`UPDATE editorial_reviews SET status='auto_public' WHERE article_id=${id}`;
    for (const path of [`/api/site/items/${id}`, `/api/site/items/${id}/original`, `/items/${id}/markdown`, `/og/items/${id}.png`, `/og/posters/${id}.png`, `/api/site/stories/${story!.public_id}`, `/api/site/stories/${story!.public_id}/developments`]) {
      assert.equal((await app.inject({ url: path })).statusCode, 404, path);
    }
    assert.equal(await loadItemShare(id), null);
    const availability = (await app.inject({ url: `/api/site/items/availability?ids=${id}` })).json();
    assert.equal(availability[id], 'unavailable');
    for (const path of ['/api/site/timeline', '/api/site/pool', '/api/v1/items?mode=all', '/api/v1/items?mode=selected', '/feed.xml', '/feed/full.xml', '/feed/all.xml', '/api/v1/selected/snapshot']) {
      assert.ok(!(await app.inject({ url: path })).body.includes(id), path);
    }
    const changes = await selectedChanges({ cursor: snapshotBefore.cursor, limit: 5000 }, await releasedLedgerClock());
    assert.ok(!changes.changes.some(change => change.op === 'upsert' && change.item.id === id), 'obsolete ledger upserts cannot export old copy');
    assert.equal(await v1Story(grouped.storyId!), null, 'the shared MCP event reader also denies old authority');
    assert.equal(provider.hits(), hits, 'public reads never request model work');
  } finally { await app.close(); }
});

test('restart sweep queues ordinary current analysis and preserves old waiting and terminal attempt history', async () => {
  const id = await unanalyzedArticle();
  await sql`UPDATE articles SET grouped_at=now() WHERE id=${id}`;
  await analyzeArticle(id);
  await verifyAutomaticArticle(id);
  const waiting = await unanalyzedArticle();
  await sql`UPDATE articles SET grouped_at=now() WHERE id=${waiting}`;
  await analyzeArticle(waiting);
  await sql`UPDATE automatic_verifications SET status='waiting',verification_count=2,failures=1,stage='evidence' WHERE article_id=${waiting}`;
  const priorAt = await releasedLedgerClock();
  const prior = await selectedSnapshot({ limit: 5000, page: null }, priorAt);
  assert.ok(prior.items.some(item => item.id === id), 'the old grant was actually synchronized before its rule became obsolete');
  for (const articleId of [id, waiting]) {
    await sql`UPDATE automatic_verifications SET automatic_rule_version=${`obsolete:${AUTOMATIC_RULE_VERSION}`} WHERE article_id=${articleId}`;
    await sql`UPDATE analyses SET prompt_version='obsolete-score-and-writer-prompts' WHERE article_id=${articleId}`;
  }
  const old = await sql`SELECT id,status,verification_count,failures,stage,receipt_ids,decisions FROM automatic_verifications WHERE article_id IN (${id},${waiting}) ORDER BY id`;
  const hits = provider.hits();
  await sweepAutomaticVerifications();
  await sweepAutomaticVerifications();
  assert.equal(provider.hits(), hits, 'sweeping queues work without model requests');
  const removed = await selectedChanges({ cursor: prior.cursor, limit: 5000 }, await releasedLedgerClock());
  assert.ok(removed.changes.some(change => change.op === 'remove' && change.id === id), 'recovery informs already-synchronized clients before any new analysis');
  const [withdrawn] = await sql`SELECT visibility FROM publications WHERE article_id=${id}`;
  assert.equal(withdrawn!.visibility, 'withdrawn');
  for (const articleId of [id, waiting]) {
    const jobs = await sql<{ data: { articleId: string; attemptTag?: string } }[]>`SELECT data FROM pgboss.job
      WHERE name=${QUEUES.analyze} AND data->>'articleId'=${articleId} AND state IN ('created','active','retry')`;
    assert.equal(jobs.length, 1, 'repeated recovery uses the ordinary singleton analysis queue');
    assert.equal(jobs[0]!.data.attemptTag, undefined, 'recovery must reuse step receipts rather than force paid re-evaluation');
    const [premature] = await sql`SELECT id FROM automatic_verifications WHERE article_id=${articleId} AND automatic_rule_version=${AUTOMATIC_RULE_VERSION}`;
    assert.equal(premature, undefined, 'old scores and writer output are not rebound as current before normal analysis');
    await processArticle(articleId);
    const [analysis] = await sql`SELECT prompt_version FROM analyses WHERE article_id=${articleId} ORDER BY id DESC LIMIT 1`;
    assert.equal(analysis!.prompt_version, ANALYZE_PROMPT_VERSION);
    const [fresh] = await sql`SELECT status,verification_count FROM automatic_verifications WHERE article_id=${articleId} AND automatic_rule_version=${AUTOMATIC_RULE_VERSION}`;
    assert.ok(fresh);
    assert.equal(fresh!.verification_count, 0);
    await verifyAutomaticArticle(articleId);
    assert.equal((await projection(articleId)).visibility, 'public', 'new current-rule acceptance restores normal publication');
  }
  assert.deepEqual(await sql`SELECT id,status,verification_count,failures,stage,receipt_ids,decisions FROM automatic_verifications WHERE id IN ${sql(old.map(row => row.id))} ORDER BY id`, old);
});

test('automatic sync rejects old ledger metadata after accepting the same verified copy again', async () => {
  const before = await selectedSnapshot({ limit: 5000, page: null }, await releasedLedgerClock());
  const ids = [await unanalyzedArticle(), await unanalyzedArticle()].sort();
  for (const articleId of ids) {
    await sql`UPDATE articles SET grouped_at=now() WHERE id=${articleId}`;
    await analyzeArticle(articleId);
    await verifyAutomaticArticle(articleId);
  }
  const id = ids[1]!;
  const [old] = await sql<{ payload: { title: string; summary: string | null; reason: string | null; score: number } }[]>`
    SELECT payload FROM selected_ledger WHERE article_id=${id} AND op='upsert' ORDER BY seq DESC LIMIT 1`;
  const firstPage = await selectedSnapshot({ limit: 1, page: null }, await releasedLedgerClock());
  assert.ok(firstPage.nextPage, 'the retained snapshot watermark has a continuation');
  assert.ok(!firstPage.items.some(item => item.id === id), 'the target remains on a later snapshot page');
  await sql`UPDATE automatic_verifications SET automatic_rule_version=${`obsolete:${AUTOMATIC_RULE_VERSION}`} WHERE article_id=${id}`;
  await sql`UPDATE analyses SET prompt_version='obsolete-score-and-writer-prompts' WHERE article_id=${id}`;
  await sweepAutomaticVerifications();
  const [material] = await sql<{ url: string }[]>`SELECT url FROM articles WHERE id=${id}`;
  await upsertMaterial({ sourceId: source, url: material!.url, title: 'Bitcoin Core release',
    bodyText: body + ' Synthetic revision note for this isolated test.', bodyStatus: 'ok', via: 'fetch' });
  scoreAnswers = [84, 85];
  await processArticle(id);
  await verifyAutomaticArticle(id);
  const [current] = await sql<{ payload: typeof old.payload }[]>`
    SELECT payload FROM selected_ledger WHERE article_id=${id} AND op='upsert' ORDER BY seq DESC LIMIT 1`;
  assert.deepEqual([current!.payload.title, current!.payload.summary, current!.payload.reason],
    [old!.payload.title, old!.payload.summary, old!.payload.reason], 'the verified Chinese copy is identical across grants');
  assert.notEqual(current!.payload.score, old!.payload.score, 'normal current analysis produces different public score metadata');
  const changes = await selectedChanges({ cursor: before.cursor, limit: 5000 });
  assert.ok(!changes.changes.some(change => change.op === 'upsert' && change.item.id === id && change.item.score === old!.payload.score),
    'identical verified copy cannot authorize obsolete ledger metadata');
  const releasedAt = await releasedLedgerClock();
  const releasedChanges = await selectedChanges({ cursor: before.cursor, limit: 5000 }, releasedAt);
  assert.ok(!releasedChanges.changes.some(change => change.op === 'upsert' && change.item.id === id && change.item.score === old!.payload.score),
    'obsolete metadata stays hidden after the current payload releases');
  assert.ok(releasedChanges.changes.some(change => change.op === 'upsert' && change.item.id === id && change.item.score === current!.payload.score),
    'the accepted current canonical payload remains available');
  const continuation = await selectedSnapshot({ limit: 5000, page: firstPage.nextPage }, releasedAt);
  assert.ok(!continuation.items.some(item => item.id === id), 'an old paginated snapshot cannot export the old payload after the grant changes');
});

test('automatic sync keeps an identical reaccepted canonical payload behind its new release gate', async () => {
  const before = await selectedSnapshot({ limit: 5000, page: null }, await releasedLedgerClock());
  const id = await unanalyzedArticle();
  await analyzeArticle(id);
  await verifyAutomaticArticle(id);
  const [old] = await sql<{ payload: Record<string, unknown> }[]>`
    SELECT payload FROM selected_ledger WHERE article_id=${id} AND op='upsert' ORDER BY seq DESC LIMIT 1`;
  const synchronized = await selectedSnapshot({ limit: 5000, page: null }, await releasedLedgerClock());
  assert.ok(synchronized.items.some(item => item.id === id), 'the previous automatic grant was released and synchronized');
  const [material] = await sql<{ url: string }[]>`SELECT url FROM articles WHERE id=${id}`;
  await upsertMaterial({ sourceId: source, url: material!.url, title: 'Bitcoin Core release',
    bodyText: body + ' Another synthetic revision note for this isolated test.', bodyStatus: 'ok', via: 'fetch' });
  const withdrawn = await sql<{ op: string }[]>`SELECT op FROM selected_ledger WHERE article_id=${id} ORDER BY seq DESC LIMIT 1`;
  assert.equal(withdrawn[0]!.op, 'remove', 'the real source revision withdraws the old grant before reanalysis');
  await processArticle(id);
  await verifyAutomaticArticle(id);
  const [current] = await sql<{ payload: Record<string, unknown>; visible_at: Date }[]>`
    SELECT payload,visible_at FROM selected_ledger WHERE article_id=${id} AND op='upsert' ORDER BY seq DESC LIMIT 1`;
  assert.deepEqual(current!.payload, old!.payload, 'normal current analysis and verification recreate the identical complete canonical payload');
  assert.ok(current!.visible_at > new Date(), 'the new grant waits for the normal 180-second release gate');
  const early = await selectedChanges({ cursor: before.cursor, limit: 1 }, new Date(current!.visible_at.getTime() - 1));
  assert.equal(early.count, 1, 'the already released historical entry is reachable before the later release watermark');
  assert.equal(early.changes[0]!.op, 'remove', 'identical current copy does not release a historical upsert early');
  const released = await selectedChanges({ cursor: before.cursor, limit: 5000 }, await releasedLedgerClock());
  assert.ok(released.changes.some(change => change.op === 'upsert' && change.item.id === id),
    'the current canonical payload becomes available after its own release');
});

test('automatic event outputs suppress an unverified structured occurrence date while preserving source dates and manual behavior', async () => {
  const sourceDate = new Date(Date.now() - 3600_000);
  const id = await article({ publishedAt: sourceDate });
  await verifyAutomaticArticle(id);
  const grouped = await groupArticle(id);
  await sql`UPDATE facts SET occurred_at='2099-01-01' WHERE story_id=${grouped.storyId!}`;
  const [story] = await sql<{ public_id: string }[]>`SELECT public_id::text FROM stories WHERE id=${grouped.storyId!}`;
  const query = { storyPublicId: story!.public_id, channel: 'all' as const, category: null, tag: null, topicTags: null, cursor: null, take: 10, revision: null };
  const detail = await loadStoryDetail(grouped.storyId!);
  assert.ok(detail);
  assert.ok(detail.developments.every(development => development.occurredAt === null));
  assert.ok(detail.developments.every(development => development.firstReportAt !== '2099-01-01T00:00:00.000Z'));
  assert.equal(detail.firstReportAt, sourceDate.toISOString());
  const developments = await loadDevelopments(query);
  assert.equal(developments.kind, 'ok');
  if (developments.kind === 'ok') assert.ok(developments.body.developments.every(development => development.occurredAt === null));
  assert.ok(!JSON.stringify(await v1Story(grouped.storyId!)).includes('2099-01-01'));
  const app = await buildApp();
  try {
    for (const path of [`/api/site/stories/${story!.public_id}`, `/api/site/stories/${story!.public_id}/developments`, `/api/v1/stories/${story!.public_id}`]) {
      const response = await app.inject({ url: path });
      assert.equal(response.statusCode, 200, path);
      assert.ok(!response.body.includes('2099-01-01'), path);
    }
  } finally { await app.close(); }
  const proposal = await getReviewProposal(id);
  const [review] = await sql<{ version: number }[]>`SELECT version FROM editorial_reviews WHERE article_id=${id}`;
  await decideArticleReview(id, { status: 'approved', curated: true, fingerprint: proposal!.fingerprint, version: review!.version, reason: 'manual source-date compatibility fixture' }, 'test');
  config.editorialMode = 'manual';
  try {
    const manual = await loadStoryDetail(grouped.storyId!);
    assert.ok(manual!.developments.some(development => development.occurredAt === '2099-01-01T00:00:00.000Z'));
    const manualDevelopments = await loadDevelopments(query);
    if (manualDevelopments.kind === 'ok') assert.ok(manualDevelopments.body.developments.some(development => development.occurredAt === '2099-01-01T00:00:00.000Z'));
    else assert.fail('manual developments remain available');
  } finally { config.editorialMode = 'automatic'; }
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
  const [safety] = await sql<{ value: { streak: number } }[]>`SELECT value FROM settings WHERE key=${`automatic.source-safety.${source}`}`;
  assert.equal(safety!.value.streak, 0, 'an accepted rewrite resets safety despite its intermediate contradiction');
});
test('five terminal deterministic amount contradictions pause a source despite raw supported verifier responses', async () => {
  const isolatedSource = `${source}-amount-conflicts`;
  await sql`INSERT INTO sources(id,name,kind,config,tier,participation_mode,first_party,next_fetch_at)
    VALUES(${isolatedSource},'Synthetic deterministic conflicts','rss',${sql.json({ feedUrl: 'https://bitcoincore.org/rss' })},
      'T1','editorial',true,'2100-01-01')`;
  await setSourceAutoPublic(isolatedSource, { enabled: true, version: 0, reason: 'synthetic safety test' }, 'test');
  rewriteSummary = 'Bitcoin Core 宣布新版客户端可用，开发成本为9亿美元。';
  try {
    for (let i = 0; i < 5; i++) {
      const id = await article({ sourceId: isolatedSource, summary: rewriteSummary });
      await verifyAutomaticArticle(id);
      const [round] = await sql<{
        status: string; verification: { verdict: string };
        decisions: Array<{ decision: { verificationVerdict: string } }>;
      }[]>`SELECT status,verification,decisions FROM automatic_verifications WHERE article_id=${id}`;
      assert.equal(round!.status, 'rejected');
      assert.equal(round!.verification.verdict, 'supported');
      assert.equal(round!.decisions.at(-1)!.decision.verificationVerdict, 'contradicted');
      if (i < 4) assert.equal(await sourcePauseUntil(isolatedSource), null);
    }
    const until = await sourcePauseUntil(isolatedSource);
    assert.ok(until && until > new Date(), 'five final contradictions must pause new paid work for this source');
    await refreshAutomaticSafety();
    assert.equal((await sourcePauseUntil(isolatedSource))!.getTime(), until!.getTime(), 'consumed terminal rounds do not trigger another pause');
    const [audits] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM audit_log
      WHERE action='automatic.source-pause' AND subject=${`source:${isolatedSource}`}`;
    assert.equal(audits!.count, 1);
  } finally { rewriteSummary = null; }
});
test('legacy rejected rounds without final decisions retain raw contradiction safety fallback', async () => {
  const legacySource = `${source}-legacy-conflicts`;
  await sql`INSERT INTO sources(id,name,kind,config,tier,participation_mode,first_party,next_fetch_at)
    VALUES(${legacySource},'Synthetic legacy contradictions','rss',${sql.json({ feedUrl: 'https://bitcoincore.org/rss' })},
      'T1','editorial',true,'2100-01-01')`;
  await setSourceAutoPublic(legacySource, { enabled: true, version: 0, reason: 'synthetic legacy safety test' }, 'test');
  for (let i = 0; i < 5; i++) {
    const id = await article({ sourceId: legacySource });
    await sql`UPDATE automatic_verifications SET status='rejected',decisions='[]'::jsonb,
      verification=${sql.json({ verdict: 'contradicted' })},updated_at=now() WHERE article_id=${id}`;
  }
  await refreshAutomaticSafety();
  const until = await sourcePauseUntil(legacySource);
  assert.ok(until && until > new Date(), 'historical terminal contradictions remain effective without decision history');
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
