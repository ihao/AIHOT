import type { BtcIngestionQuote, BtcUsdQuote } from "@aihot/contracts/market";
import { sql, type Db } from "../db.ts";

export interface BtcQuoteRow {
  price_usd: number;
  quoted_at: Date;
  fetched_at: Date;
}

function quoteView(row: BtcQuoteRow): BtcUsdQuote {
  return { priceUsd: Number(row.price_usd), quotedAt: row.quoted_at.toISOString(), fetchedAt: row.fetched_at.toISOString(), source: "Coinbase", currency: "USD" };
}

export async function getLatestBtcUsdQuote(db: Db = sql): Promise<BtcUsdQuote | null> {
  const [row] = await db<BtcQuoteRow[]>`SELECT price_usd, quoted_at, fetched_at FROM btc_usd_quotes ORDER BY fetched_at DESC, id DESC LIMIT 1`;
  return row ? quoteView(row) : null;
}

export interface IngestionQuoteRow {
  ingested_at?: Date | null;
  btc_price_usd?: number | null;
  btc_quoted_at?: Date | null;
  btc_fetched_at?: Date | null;
}

export function ingestionQuoteView(row: IngestionQuoteRow): BtcIngestionQuote | null {
  if (!row.ingested_at || row.btc_price_usd == null || !row.btc_quoted_at || !row.btc_fetched_at) return null;
  return { ...quoteView({ price_usd: row.btc_price_usd, quoted_at: row.btc_quoted_at, fetched_at: row.btc_fetched_at }), ingestedAt: row.ingested_at.toISOString() };
}
