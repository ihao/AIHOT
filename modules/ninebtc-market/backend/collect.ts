import type { BtcUsdQuote } from "@aihot/contracts/market";
import { sql, type Db } from "@aihot/backend/db";
import { guardedFetch } from "@aihot/backend/lib/http-fetch";

const COINBASE_TICKER = "https://api.exchange.coinbase.com/products/BTC-USD/ticker";
const MAX_QUOTE_AGE_MS = 5 * 60_000;

export function parseCoinbaseTicker(payload: unknown, fetchedAt: Date): { priceUsd: number; tradeId: number; quotedAt: Date } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Number.isFinite(fetchedAt.getTime())) return null;
  const { price, trade_id, time } = payload as Record<string, unknown>;
  if (typeof price !== "string" || !/^\d+(?:\.\d{1,8})?$/.test(price)) return null;
  const priceUsd = Number(price);
  if (!Number.isFinite(priceUsd) || priceUsd <= 0 || priceUsd >= 1e12) return null;
  if (typeof trade_id !== "number" || !Number.isSafeInteger(trade_id) || trade_id <= 0) return null;
  if (typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(time)) return null;
  const quotedAt = new Date(time);
  if (!Number.isFinite(quotedAt.getTime()) || quotedAt.toISOString().slice(0, 10) !== time.slice(0, 10)) return null;
  const age = fetchedAt.getTime() - quotedAt.getTime();
  return age < -5000 || age > MAX_QUOTE_AGE_MS ? null : { priceUsd, tradeId: trade_id, quotedAt };
}

/** Only the worker calls upstream. Errors leave saved quotes intact and fail the recorded cron run. */
export async function collectBtcUsdQuote(options: { db?: Db; fetch?: typeof guardedFetch; now?: () => Date } = {}): Promise<BtcUsdQuote | null> {
  if (process.env.COLLECT_ENABLED !== "true") return null;
  const response = await (options.fetch ?? guardedFetch)(COINBASE_TICKER, {
    timeoutMs: 10000, maxBytes: 16384, maxRedirects: 0,
    route: "egress", headers: { accept: "application/json" },
  });
  if (response.status !== 200) throw new Error(`Coinbase BTC-USD HTTP ${response.status}`);
  const fetchedAt = (options.now ?? (() => new Date()))();
  const quote = parseCoinbaseTicker(JSON.parse(response.text()) as unknown, fetchedAt);
  if (!quote) throw new Error("Coinbase BTC-USD returned an invalid or stale quote");
  const db = options.db ?? sql;
  await db`INSERT INTO btc_usd_quotes (price_usd, trade_id, quoted_at, fetched_at)
           VALUES (${quote.priceUsd}, ${quote.tradeId}, ${quote.quotedAt}, ${fetchedAt})`;
  return { priceUsd: quote.priceUsd, quotedAt: quote.quotedAt.toISOString(), fetchedAt: fetchedAt.toISOString(), source: "Coinbase", currency: "USD" };
}
