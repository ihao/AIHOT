import { gate, tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { beijingDate } from "@aihot/contracts/time";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { proposeReview } from "@aihot/backend/editorial/review";
import { decideArticleReview } from "@aihot/backend/editorial/decision";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { publishArticleTx } from "@aihot/backend/publication/publish";
import { loadReport } from "@aihot/backend/publication/reports";
import { createDailyDraft, publishDailyDraft } from "@aihot/backend/reports/editorial";

const suffix = tag();
const sourceId = `report-cutoff-${suffix}`;
const issueKeys: string[] = [];
let previousLaunch: unknown;
let firstCutoff: Date;
let secondCutoff: Date;
let thirdCutoff: Date;
let serial = 0;

before(async () => {
  const [last] = await sql<{ window_end: Date }[]>`
    SELECT window_end FROM published_reports WHERE kind='daily' ORDER BY window_end DESC LIMIT 1`;
  const base = Math.max(Date.now(), last?.window_end.getTime() ?? 0) + 48 * 3600_000;
  firstCutoff = new Date(base + 5 * 60_000);
  secondCutoff = new Date(firstCutoff.getTime() + 24 * 3600_000);
  thirdCutoff = new Date(secondCutoff.getTime() + 24 * 3600_000);
  const [setting] = await sql<{ value: unknown }[]>`SELECT value FROM settings WHERE key='report_launch_start'`;
  previousLaunch = setting?.value;
  await sql`UPDATE settings SET value=${sql.json({ at: new Date(base - 3600_000).toISOString() })}
    WHERE key='report_launch_start'`;
  await sql`INSERT INTO sources (id,name,kind,tier,participation_mode,first_party,next_fetch_at)
    VALUES (${sourceId},'Report cutoff fixture','rss','T1','editorial',true,'2100-01-01')`;
});

after(async () => {
  await sql`DELETE FROM reports WHERE kind='daily' AND key = ANY(${issueKeys}::text[])`;
  await sql`UPDATE publications SET visibility='withdrawn',selected=false WHERE source_id=${sourceId}`;
  if (previousLaunch) await sql`UPDATE settings SET value=${sql.json(previousLaunch as never)} WHERE key='report_launch_start'`;
  await stopBoss();
  await closeDb();
});

async function reviewable(label: string) {
  const at = new Date();
  const { articleId, backfill } = await upsertMaterial({
    sourceId, url: `https://official.example.org/report-cutoff-${suffix}-${++serial}`,
    title: `Official Web3 release ${label}`, bodyText: `Official release notes for ${label}.`,
    bodyStatus: "ok", via: "fetch", publishedAt: at, discoveredAt: at,
  });
  assert.equal(backfill, false);
  await sql`INSERT INTO analyses (article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected)
    VALUES (${articleId},1,'rule','pass','infrastructure',${`官方发布 ${label}`},${`经核对的发布说明 ${label}`},80,true)`;
  await sql`UPDATE articles SET processing_state='analyzed',grouped_at=${new Date(at.getTime() - 60_000)}
    WHERE id=${articleId}`;
  const proposal = await proposeReview(articleId);
  assert.ok(proposal);
  const [review] = await sql<{ version: number }[]>`SELECT version FROM editorial_reviews WHERE article_id=${articleId}`;
  return { articleId, proposal, reviewVersion: review!.version };
}

async function selected(label: string) {
  const item = await reviewable(label);
  await decideArticleReview(item.articleId, {
    status: "approved", curated: true, fingerprint: item.proposal.fingerprint,
    version: item.reviewVersion, reason: "Checked official release and Chinese summary",
  }, "report-editor");
  const [publication] = await sql<{ selected: boolean; visible_after: Date }[]>`
    SELECT selected,visible_after FROM publications WHERE article_id=${item.articleId}`;
  assert.equal(publication?.selected, true);
  return { ...item, visibleAfter: publication!.visible_after };
}

function citedIds(content: { sections: Array<{ items: Record<string, unknown>[] }>; flashes: Record<string, unknown>[] }) {
  const ids = [...content.sections.flatMap((section) => section.items), ...content.flashes].map((item) => item.itemId);
  assert.ok(ids.every((id) => typeof id === "string"));
  return ids as string[];
}

async function waitForBlocked(blocker: number, operation: Promise<unknown>) {
  const deadline = performance.now() + 5_000;
  while (!(await sql`SELECT 1 FROM pg_stat_activity WHERE ${blocker} = ANY(pg_blocking_pids(pid))`)[0]) {
    if (performance.now() >= deadline) assert.fail("draft did not wait for the publication transaction");
    await Promise.race([operation.then(() => assert.fail("draft finished before publication committed")), delay(10)]);
  }
}

test("manual cutoffs allocate each reviewed selection to exactly one published issue", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(firstCutoff.getTime() - 5 * 60_000) });
  const before = await selected("before cutoff");
  assert.ok(before.visibleAfter < firstCutoff);

  t.mock.timers.setTime(firstCutoff.getTime());
  const at = await selected("at cutoff");
  assert.ok(at.visibleAfter >= firstCutoff);
  const first = await createDailyDraft("report-editor", firstCutoff);
  issueKeys.push(first.key);
  assert.equal(first.key, beijingDate(firstCutoff));
  assert.deepEqual(citedIds(first.content).filter((id) => [before.articleId, at.articleId].includes(id)), [before.articleId]);
  assert.equal(await loadReport("daily", first.key), null, "a draft never auto-releases");
  await publishDailyDraft(first.draftId, "report-editor", "Checked first cutoff and citations");

  t.mock.timers.setTime(firstCutoff.getTime() + 60_000);
  const afterCutoff = await selected("after cutoff");
  assert.ok(afterCutoff.visibleAfter > firstCutoff);
  t.mock.timers.setTime(secondCutoff.getTime());
  const second = await createDailyDraft("report-editor", secondCutoff);
  issueKeys.push(second.key);
  assert.equal(second.key, beijingDate(secondCutoff));
  assert.deepEqual(new Set(citedIds(second.content)), new Set([at.articleId, afterCutoff.articleId]));
  assert.equal(await loadReport("daily", second.key), null, "the next issue is private until approval");
  await publishDailyDraft(second.draftId, "report-editor", "Checked second cutoff and citations");

  const [firstVersion, secondVersion] = await sql<{ citations: Array<{ articleId: string }> }[]>`
    SELECT v.citations FROM report_versions v JOIN reports r ON r.id=v.report_id
    WHERE r.kind='daily' AND r.key IN (${first.key},${second.key}) ORDER BY v.window_end`;
  const counts = [firstVersion, secondVersion].flatMap((version) => version!.citations.map((citation) => citation.articleId));
  for (const id of [before.articleId, at.articleId, afterCutoff.articleId]) {
    assert.equal(counts.filter((candidate) => candidate === id).length, 1, `${id} appears in exactly one issue`);
  }
  assert.deepEqual(firstVersion!.citations.map((c) => c.articleId), [before.articleId]);
  assert.deepEqual(new Set(secondVersion!.citations.map((c) => c.articleId)),
    new Set([at.articleId, afterCutoff.articleId]));
});

test("draft waits for an in-flight reviewed release, then rejects a changed candidate", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(thirdCutoff.getTime() - 60_000) });
  const item = await reviewable("transaction held before cutoff");
  const written = gate<number>();
  const commit = gate();
  const publication = sql.begin(async (tx) => {
    await tx`UPDATE editorial_reviews SET status='approved',version=version+1,reviewed_by='report-editor',
      reason='Checked release',reviewed_at=now() WHERE article_id=${item.articleId}`;
    await tx`INSERT INTO editorial_curations
      (article_id,status,fingerprint,review_version,reviewed_by,reason,reviewed_at)
      VALUES (${item.articleId},'approved',${item.proposal.fingerprint},${item.reviewVersion + 1},
        'report-editor','Checked curation',now())`;
    await publishArticleTx(tx, item.articleId);
    const [row] = await tx<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
    written.open(row!.pid);
    await commit.promise;
  });
  let draft: ReturnType<typeof createDailyDraft> | undefined;
  try {
    const pid = await Promise.race([written.promise, publication.then(() => assert.fail("publication exited before commit gate"))]);
    t.mock.timers.setTime(thirdCutoff.getTime());
    draft = createDailyDraft("report-editor", thirdCutoff);
    await waitForBlocked(pid, draft);
    commit.open();
    await publication;
    const result = await draft;
    issueKeys.push(result.key);
    assert.equal(citedIds(result.content).includes(item.articleId), true,
      "a pre-cutoff release that commits during snapshot acquisition is not omitted");
    assert.equal(await loadReport("daily", result.key), null);

    const [original] = await sql<{ body_text: string }[]>`SELECT body_text FROM articles WHERE id=${item.articleId}`;
    await sql`UPDATE articles SET body_text='Changed after draft approval' WHERE id=${item.articleId}`;
    await assert.rejects(() => publishDailyDraft(result.draftId, "report-editor", "Checked stale draft"),
      /变化|重新/, "a stale citation cannot be published");
    await sql`UPDATE articles SET body_text=${original!.body_text} WHERE id=${item.articleId}`;
    const published = await publishDailyDraft(result.draftId, "report-editor", "Rechecked restored candidate");
    assert.equal(published.version, 1);
    assert.equal((await loadReport("daily", result.key))?.sections.flatMap((section) => section.items)
      .some((candidate) => candidate.itemId === item.articleId), true);
  } finally {
    commit.open();
    await Promise.allSettled([publication, draft]);
  }
});
