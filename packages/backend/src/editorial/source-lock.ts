// Source edits revoke every existing article grant. The common lock order is
// article IDs (ascending) -> report candidates -> source -> review/projection.
import { sql, type Tx } from "../db.ts";

class SourceArticleSetChanged extends Error {}

/**
 * Lock the source's complete article set before taking the source lock. A new
 * article inserted between the first scan and source lock forces a retry; once
 * the source is locked, its FK check blocks further inserts until commit.
 */
export async function withLockedSourceArticles<T>(
  sourceId: string,
  fn: (tx: Tx, articleIds: string[], sourceExists: boolean) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await sql.begin(async (tx) => {
        const articles = await tx<{ id: string }[]>`
          SELECT id FROM articles WHERE source_id = ${sourceId} ORDER BY id FOR UPDATE`;
        await tx`SELECT pg_advisory_xact_lock_shared(hashtext('report_candidates'))`;
        const [source] = await tx`SELECT id FROM sources WHERE id = ${sourceId} FOR UPDATE`;
        const latest = await tx<{ id: string }[]>`SELECT id FROM articles WHERE source_id = ${sourceId} ORDER BY id`;
        if (latest.length !== articles.length || latest.some((row, i) => row.id !== articles[i]?.id)) {
          throw new SourceArticleSetChanged();
        }
        return fn(tx, articles.map((row) => row.id), !!source);
      }) as T;
    } catch (error) {
      if (!(error instanceof SourceArticleSetChanged)) throw error;
    }
  }
  throw new Error("source article set changed repeatedly; retry the source edit");
}
