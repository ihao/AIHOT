import "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { setSourceAutoPublic, proposeReview } from "@aihot/backend/editorial/review";
import { decideArticleReview } from "@aihot/backend/editorial/decision";
import { considerAutoPublicationTx } from "@aihot/backend/editorial/auto-publication";
import { publishArticleTx } from "@aihot/backend/publication/publish";
import { tag } from "./setup.ts";

const T = tag();
const source = `auto-${T}`;
let serial = 0;
const BODY = "Bitcoin Core 30.1 is now available. This routine software release updates the desktop client and includes maintenance improvements for supported operating systems.";

before(async () => {
  await sql`INSERT INTO sources (id,name,kind,config,tier,participation_mode,first_party,owner_entity_id,next_fetch_at)
    VALUES (${source},'Official release','rss',${sql.json({ feedUrl: "https://bitcoin.example.org/rss" })},'T1','editorial',true,'bitcoin-core','2100-01-01')`;
  await setSourceAutoPublic(source, { enabled: true, version: 0, reason: "synthetic test source" }, "test-editor");
});
after(async () => { await closeDb(); });

async function analyzed(title = "Bitcoin Core 30.1 released") {
  const { articleId } = await upsertMaterial({ sourceId: source, url: `https://bitcoin.example.org/releases/30.1-${++serial}`,
    title, bodyText: BODY, bodyStatus: "ok", via: "fetch" });
  await sql`INSERT INTO analyses (article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected,output)
    VALUES (${articleId},1,'model','pass','infrastructure','Bitcoin Core 30.1 软件版本发布',
      'Bitcoin Core 发布 30.1 软件版本，更新了客户端中的常规功能。',35,false,
      ${sql.json({ writer: "understand", itemType: "protocol_upgrade", authorRole: "principal" })})`;
  await sql`UPDATE articles SET processing_state='analyzed' WHERE id=${articleId}`;
  return articleId;
}

async function considerAndPublish(articleId: string) {
  return sql.begin(async (tx) => {
    await tx`SELECT id FROM articles WHERE id=${articleId} FOR UPDATE`;
    const result = await considerAutoPublicationTx(tx, articleId);
    await publishArticleTx(tx, articleId);
    return result;
  });
}

test("a synthetic safe release is auto-public only in all-feed, with an audited exact grant", async () => {
  const id = await analyzed();
  const result = await considerAndPublish(id);
  assert.equal(result.granted, true, result.reason);
  const [row] = await sql<{ visibility: string; selected: boolean; review_status: string }[]>`
    SELECT p.visibility,p.selected,r.status AS review_status FROM publications p
    JOIN editorial_reviews r ON r.article_id=p.article_id WHERE p.article_id=${id}`;
  assert.deepEqual([row!.visibility, row!.selected, row!.review_status], ["public", false, "auto_public"]);
  const [audit] = await sql`SELECT reason FROM audit_log WHERE subject=${`content:${id}`} AND action='content.auto_public'`;
  assert.match(String(audit!.reason), /例行/);
});

test("risk words in original material hold an otherwise routine model output", async () => {
  const id = await analyzed("Bitcoin Core 30.1 CVE-2026-1234 fix released");
  const result = await considerAndPublish(id);
  assert.equal(result.granted, false);
  assert.match(result.reason, /安全|人工审核/);
  const [row] = await sql<{ visibility: string }[]>`SELECT visibility FROM publications WHERE article_id=${id}`;
  assert.equal(row!.visibility, "withdrawn");
});

test("a prior human rejection cannot turn into automatic publication after reanalysis", async () => {
  const id = await analyzed();
  const proposal = await proposeReview(id);
  assert.ok(proposal);
  const [review] = await sql<{ version: number }[]>`SELECT version FROM editorial_reviews WHERE article_id=${id}`;
  await decideArticleReview(id, { status: "rejected", fingerprint: proposal.fingerprint, version: review!.version, reason: "human hold" }, "editor");
  await sql`INSERT INTO analyses (article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected,output)
    VALUES (${id},1,'model','pass','infrastructure','Bitcoin Core 30.1 软件版本发布',
      'Bitcoin Core 发布 30.1 软件版本，更新了客户端中的常规功能。',35,false,
      ${sql.json({ writer: "understand", itemType: "protocol_upgrade", authorRole: "principal" })})`;
  const result = await considerAndPublish(id);
  assert.equal(result.granted, false);
  assert.match(result.reason, /人工/);
  const [row] = await sql<{ visibility: string }[]>`SELECT visibility FROM publications WHERE article_id=${id}`;
  assert.equal(row!.visibility, "withdrawn");
});
