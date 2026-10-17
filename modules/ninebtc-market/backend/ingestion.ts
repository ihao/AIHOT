import type { Db } from "@aihot/backend/db";

/** Called only for the winning first insert, inside the ingestion transaction. No backfill or later update. */
export async function bindIngestionQuote(id: string, db: Db): Promise<void> {
  await db`
    WITH t AS MATERIALIZED (SELECT clock_timestamp() AS at)
    UPDATE articles SET ingested_at = t.at, btc_quote_id = (
      SELECT q.id FROM btc_usd_quotes q
      WHERE q.fetched_at BETWEEN t.at - interval '5 minutes' AND t.at
        AND q.quoted_at BETWEEN t.at - interval '5 minutes' AND t.at
      ORDER BY q.fetched_at DESC, q.id DESC LIMIT 1
    ) FROM t WHERE articles.id = ${id} AND articles.ingested_at IS NULL`;
}
