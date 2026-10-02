// Merging stories: facts and heat evidence move into the surviving story, and the old
// public id keeps answering as an alias. Editors merge from the admin; grouping merges when two
// stories turn out to be one (consolidate in group.ts).
import { sql } from "../db.ts";
import { audit } from "../admin/auth.ts";
import { enqueue, QUEUES } from "../jobs/queue.ts";
import { publishArticleTx } from "../publication/publish.ts";
import { invalidateStoryCurationTx } from "./eligibility.ts";

class MembershipChangedDuringMerge extends Error {}

async function membersOf(storyId: number): Promise<string[]> {
  const rows = await sql<{ article_id: string }[]>`
    SELECT DISTINCT fa.article_id FROM facts f JOIN fact_articles fa ON fa.fact_id = f.id
    WHERE f.story_id = ${storyId} ORDER BY fa.article_id`;
  return rows.map((r) => r.article_id);
}

/** Merges `fromId` into `intoId`; null when either story is missing or already merged (nothing changes then). */
export async function mergeStoryInto(fromId: number, intoId: number, reason: string, actor: string): Promise<{ moved: number } | null> {
  if (fromId === intoId) throw new Error("cannot merge a story into itself");
  let articles: string[] | null = null;
  // Other grouping writes lock the article before changing its membership. Lock the known members
  // in that same order, then the stories; retry if a new member arrived while the locks were taken.
  for (let attempt = 0; attempt < 3; attempt++) {
    const known = await membersOf(fromId);
    try {
      articles = await sql.begin(async (tx) => {
        for (const articleId of known) await tx`SELECT id FROM articles WHERE id = ${articleId} FOR UPDATE`;
        const stories = await tx<{ id: number; public_id: string; merged_into: number | null }[]>`
          SELECT id, public_id::text, merged_into FROM stories WHERE id IN (${fromId}, ${intoId}) ORDER BY id FOR UPDATE`;
        const from = stories.find((s) => Number(s.id) === fromId);
        const into = stories.find((s) => Number(s.id) === intoId);
        if (!from || !into || from.merged_into || into.merged_into) return null;
        const current = await tx<{ article_id: string }[]>`
          SELECT DISTINCT fa.article_id FROM facts f JOIN fact_articles fa ON fa.fact_id = f.id
          WHERE f.story_id = ${fromId} ORDER BY fa.article_id`;
        if (current.some((r) => !known.includes(r.article_id))) throw new MembershipChangedDuringMerge();
        await tx`UPDATE facts SET story_id = ${intoId}, updated_at = now() WHERE story_id = ${fromId}`;
        // A report with evidence in both stories keeps one row: (story, article) is unique.
        await tx`INSERT INTO story_signals (story_id, article_id, participant_key, source_id, kind, observed_at)
                 SELECT ${intoId}, article_id, participant_key, source_id, kind, observed_at FROM story_signals WHERE story_id = ${fromId}
                 ON CONFLICT (story_id, article_id) DO NOTHING`;
        await tx`DELETE FROM story_signals WHERE story_id = ${fromId}`;
        await tx`UPDATE stories SET merged_into = ${intoId}, version = version + 1, updated_at = now() WHERE id = ${fromId}`;
        await tx`UPDATE stories SET version = version + 1, updated_at = now(),
                   latest_at = greatest(latest_at, (SELECT latest_at FROM stories WHERE id = ${fromId})),
                   first_report_at = least(first_report_at, (SELECT first_report_at FROM stories WHERE id = ${fromId}))
                 WHERE id = ${intoId}`;
        await tx`INSERT INTO story_aliases (public_id, story_id) VALUES (${from.public_id}, ${intoId}) ON CONFLICT DO NOTHING`;
        for (const { article_id } of current) {
          await invalidateStoryCurationTx(tx, article_id);
          await publishArticleTx(tx, article_id);
        }
        return current.map((r) => r.article_id);
      });
      break;
    } catch (error) {
      if (!(error instanceof MembershipChangedDuringMerge) || attempt === 2) throw error;
    }
  }
  if (!articles) return null;
  await enqueue(QUEUES.digest, { storyId: intoId }, { singletonKey: `story:${intoId}` });
  await audit(actor, "story.merge", `story:${fromId}`, reason, null, { into: intoId });
  return { moved: articles.length };
}
