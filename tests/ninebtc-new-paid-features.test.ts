import { embeddingsStub, stub, tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { sql, closeDb } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { readerOf, seenOnCard } from "@aihot/backend/events/cards";
import { publishArticle } from "@aihot/backend/publication/publish";
import { stopBoss } from "@aihot/backend/jobs/queue";

const provider = await stub(() => ({ choices: [{ message: { content: JSON.stringify({ a: "发布", b: "发布", relation: "SAME_OCCURRENCE", confidence: 1, difference: "" }) } }] }));
for (const name of ["DEEPSEEK", "XIAOMI_MIMO"]) {
  process.env[`${name}_BASE_URL`] = `${provider.url}/v1`;
  process.env[`${name}_API_KEY`] = "test-key";
}
const embeddings = await embeddingsStub();
after(async () => { await provider.close(); await embeddings.close(); await stopBoss(); await closeDb(); });

test("the site upgrade does not buy the new reader-card comparison for a matching selected card", async () => {
  const source = `paid-card-${tag()}`;
  await sql`INSERT INTO sources(id,name,kind,tier) VALUES (${source},'Card source','rss','T1')`;
  const ids: string[] = [];
  for (const suffix of ["shown", "candidate"]) {
    const { articleId } = await upsertMaterial({ sourceId: source, url: `https://example.org/${source}/${suffix}`, title: "以太坊发布协议更新", bodyText: "以太坊发布协议更新。", bodyStatus: "ok", publishedAt: new Date(), via: "fetch" });
    await sql`INSERT INTO analyses(article_id,input_revision,origin,relevance,category,title_zh,summary_zh,score,selected)
      VALUES (${articleId},1,'rule','pass','infrastructure','以太坊发布协议更新','以太坊发布协议更新。',90,true)`;
    await sql`UPDATE articles SET grouping_status='complete',selection_adds_value=true WHERE id=${articleId}`;
    await publishArticle(articleId, { releasedAt: new Date(Date.now() - 60_000) });
    ids.push(articleId);
  }
  const reader = await readerOf(ids[1]!);
  assert.ok(reader);
  const calls = provider.hits();
  assert.equal(await seenOnCard(reader, null), null);
  assert.equal(provider.hits(), calls, "existing grouping remains; the new paid comparison needs an explicit site decision");
});
