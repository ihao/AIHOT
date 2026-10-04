import type { BtcMarketResponse, BtcUsdQuote } from "@aihot/contracts/market";
import { toBeijingIso } from "@aihot/contracts/time";

const REFRESH_MS = 10 * 60_000;
const DELAY_MS = 15 * 60_000;
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatBtcUsd = (price: number) => `${usd.format(price)} USD`;
export const formatBtcTime = (iso: string) => `${toBeijingIso(iso).slice(0, 19).replace("T", " ")}（北京时间）`;

export function btcQuoteDelayed(quote: BtcUsdQuote | null, now: number, failed: boolean): boolean {
  return !!quote && (failed || now - Date.parse(quote.quotedAt) > DELAY_MS || now - Date.parse(quote.fetchedAt) > DELAY_MS);
}

export interface BtcMarketState { quote: BtcUsdQuote | null; failed: boolean; now: number }
interface PollEnvironment {
  now: () => number;
  visible: () => boolean;
  setTimer: (run: () => void, ms: number) => () => void;
  onVisibilityChange: (run: () => void) => () => void;
  fetchQuote: (signal: AbortSignal) => Promise<BtcMarketResponse>;
}

function validQuote(value: unknown): value is BtcUsdQuote {
  if (!value || typeof value !== "object") return false;
  const q = value as BtcUsdQuote;
  return typeof q.priceUsd === "number" && Number.isFinite(q.priceUsd) && q.priceUsd > 0 && q.priceUsd < 1e12 &&
    q.currency === "USD" && q.source === "Coinbase" && typeof q.quotedAt === "string" && typeof q.fetchedAt === "string" &&
    Number.isFinite(Date.parse(q.quotedAt)) && Number.isFinite(Date.parse(q.fetchedAt));
}

function browserEnvironment(): PollEnvironment {
  return {
    now: Date.now,
    visible: () => document.visibilityState === "visible",
    setTimer: (run, ms) => { const timer = window.setTimeout(run, ms); return () => window.clearTimeout(timer); },
    onVisibilityChange: (run) => { document.addEventListener("visibilitychange", run); return () => document.removeEventListener("visibilitychange", run); },
    fetchQuote: async (signal) => {
      const res = await fetch("/api/site/market/btc", { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) });
      if (!res.ok) throw new Error(`BTC market HTTP ${res.status}`);
      return await res.json() as BtcMarketResponse;
    },
  };
}

/** Poll only while visible. The independent clock updates age labels without fetching prices. */
export function startBtcPolling(initial: BtcUsdQuote | null, update: (state: BtcMarketState) => void, env: PollEnvironment = browserEnvironment()): () => void {
  let quote = initial, failed = false, alive = true;
  let request: AbortController | null = null;
  let cancelPoll: (() => void) | null = null, cancelClock: (() => void) | null = null;
  const emit = () => { if (alive) update({ quote, failed, now: env.now() }); };
  const clock = () => {
    cancelClock?.(); cancelClock = null;
    if (!alive || !env.visible()) return;
    const age = quote ? Math.max(env.now() - Date.parse(quote.quotedAt), env.now() - Date.parse(quote.fetchedAt)) : DELAY_MS + 1;
    const wait = age <= DELAY_MS ? Math.min(60_000, Math.max(1, DELAY_MS + 1 - age)) : 60_000;
    cancelClock = env.setTimer(() => { emit(); clock(); }, wait);
  };
  const refresh = async () => {
    if (!alive || !env.visible() || request) return;
    cancelPoll?.();
    cancelPoll = env.setTimer(() => { cancelPoll = null; void refresh(); }, REFRESH_MS);
    const current = new AbortController(); request = current;
    try {
      const result = await env.fetchQuote(current.signal);
      if (!alive || current.signal.aborted || request !== current) return;
      if (result?.quote === null && quote === null) failed = false;
      else if (validQuote(result?.quote)) { quote = result.quote; failed = false; }
      else throw new Error("BTC market quote unavailable");
      emit(); clock();
    } catch {
      if (alive && !current.signal.aborted && request === current) { failed = true; emit(); clock(); }
    } finally { if (request === current) request = null; }
  };
  const changed = () => {
    if (!env.visible()) {
      cancelPoll?.(); cancelPoll = null; cancelClock?.(); cancelClock = null;
      request?.abort(); request = null;
    } else { emit(); clock(); void refresh(); }
  };
  const removeVisibility = env.onVisibilityChange(changed);
  emit(); clock(); void refresh();
  return () => { alive = false; removeVisibility(); cancelPoll?.(); cancelClock?.(); request?.abort(); request = null; };
}
