import "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { beijingDate } from "@aihot/contracts/time";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { proposeReview } from "@aihot/backend/editorial/review";
import { decideArticleReview } from "@aihot/backend/editorial/decision";
import { createDailyDraft, dailyDraft, publishDailyDraft } from "@aihot/backend/reports/editorial";
import { loadReport } from "@aihot/backend/publication/reports";
import { tag } from "./setup.ts";

const suffix = tag();
const sourceId = `report-editorial-${suffix}`;
const key = beijingDate(new Date());
let previousStart: unknown;

before(async () => {
  const [setting] = await sql<{ value: unknown }[]>`SELECT value FROM settings WHERE key='report_launch_start'`;
  previousStart = setting?.value;
  await sql`UPDATE settings SET value=${sql.json({ at: new Date(Date.now() - 3600_000).toISOString() })} WHERE key='report_launch_start'`;
  await sql`INSERT INTO sources (id,name,kind,config,tier,participation_mode,first_party,enabled,next_fetch_at)
    VALUES (${sourceId},'Report official fixture','rss','{}'::jsonb,'T1','editorial',true,true,'2100-01-01')`;
  await sql`INSERT INTO reports (kind,key,window_start,window_end,content,generated_at,origin)
    VALUES ('daily',${key},now() - interval '2 hours',now() - interval '1 hour',
      ${sql.json({ lead: { title: `Legacy hidden ${suffix}` } })},now() - interval '1 hour','imported')`;
});
after(async () => {
  if (previousStart) await sql`UPDATE settings SET value=${sql.json(previousStart as never)} WHERE key='report_launch_start'`;
  await sql`DELETE FROM reports WHERE kind='daily' AND key=${key}`;
  await sql`UPDATE publications SET visibility='withdrawn',selected=false WHERE source_id=${sourceId}`;
  await stopBoss();
  await closeDb();
});

async function selectedArticle() {
  const { articleId } = await upsertMaterial({ sourceId,
    url: `https://official.example.org/release-${suffix}`, title: "Web3 client release",
    bodyText: "Official software release details.", bodyStatus: "ok", via: "fetch", publishedAt: new Date() });
  await sql`INSERT INTO analyses (article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected)
    VALUES (${articleId},1,'rule','pass','infrastructure','Web3 客户端发布正式版本','官方发布客户端正式版本，并说明升级内容。',80,true)`;
  await sql`UPDATE articles SET processing_state='analyzed',grouped_at=now() - interval '1 minute' WHERE id=${articleId}`;
  const proposal = await proposeReview(articleId);
  assert.ok(proposal);
  const [review] = await sql<{ version: number }[]>`SELECT version FROM editorial_reviews WHERE article_id=${articleId}`;
  await decideArticleReview(articleId, { status: "approved", curated: true,
    fingerprint: proposal.fingerprint, version: review!.version, reason: "verified official release" }, "report-editor");
  return articleId;
}

test("legacy rows and a new draft stay private; approved version is the sole public report", async () => {
  assert.equal(await loadReport("daily", key), null);
  const [legacy] = await sql<{ content: { lead: { title: string } }; active_version_id: number | null }[]>`
    SELECT content,active_version_id FROM reports WHERE kind='daily' AND key=${key}`;
  assert.match(legacy!.content.lead.title, /Legacy hidden/);
  assert.equal(legacy!.active_version_id, null);
  const articleId = await selectedArticle();
  const [release] = await sql<{ visible_after: Date }[]>`SELECT visible_after FROM publications WHERE article_id=${articleId}`;
  const early = await createDailyDraft("report-editor", new Date(release!.visible_after.getTime() - 1))
    .catch((error: Error) => { if (/空日报|尚无/.test(error.message)) return null; throw error; });
  if (early) assert.equal(JSON.stringify(early.content).includes(articleId), false, "pre-release cutoff cannot cite the item");
  const generated = await createDailyDraft("report-editor");
  assert.equal(generated.key, key);
  assert.ok(generated.candidates >= 1);
  assert.equal(await loadReport("daily", key), null, "a draft never appears through the public report reader");
  const pending = await dailyDraft(key);
  assert.equal(pending?.draft_id, generated.draftId);
  assert.equal(pending?.active_version_id, null);
  const [material] = await sql<{ body_text: string }[]>`SELECT body_text FROM articles WHERE id=${articleId}`;
  await sql`UPDATE articles SET body_text='Material changed after the draft' WHERE id=${articleId}`;
  await assert.rejects(() => publishDailyDraft(generated.draftId, "report-editor", "stale"), /变化|重新/);
  await sql`UPDATE articles SET body_text=${material!.body_text} WHERE id=${articleId}`;
  const published = await publishDailyDraft(generated.draftId, "report-editor", "checked source and Chinese copy");
  assert.equal(published.version, 1);
  const publicReport = await loadReport("daily", key);
  assert.ok(publicReport);
  assert.equal(publicReport.sections.flatMap((s) => s.items).some((i) => i.itemId === articleId), true);
  await assert.rejects(() => publishDailyDraft(generated.draftId, "report-editor", "again"), /变化|重新/);
  const [original] = await sql<{ url: string; title: string }[]>`SELECT url,title FROM articles WHERE id=${articleId}`;
  await upsertMaterial({ sourceId, url: original!.url, title: original!.title,
    bodyText: "Corrected material after publication.", bodyStatus: "ok", via: "fetch" });
  const corrected = await loadReport("daily", key);
  const cited = corrected!.sections.flatMap((s) => s.items).find((i) => i.itemId === articleId);
  assert.equal(cited?.available, false, "old issue freezes its citation until an editor approves a revised edition");
});
