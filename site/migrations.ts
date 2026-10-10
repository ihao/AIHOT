// 9BTC's small price catalog must survive upstream's retirement of its metadata columns.
// The runner invokes this only inside the same transaction as an unapplied historical migration.
import { readFileSync } from "node:fs";
import type postgres from "postgres";

export async function beforeMigration(db: postgres.ReservedSql, name: string): Promise<void> {
  if (name !== "0051_drop_unused_state.sql") return;
  // Use the same single-statement DDL that the runner validates and later records as 0085.
  await db.unsafe(readFileSync(new URL("../database/migrations/0085_ninebtc_model_price_evidence.sql", import.meta.url), "utf8"));
  await db`INSERT INTO ninebtc_model_price_evidence (service, model, per_request, verified_on, source_url, note)
    SELECT service, model, per_request, verified_on, source_url, note FROM service_prices
    ON CONFLICT (service, model) DO NOTHING`;
}
