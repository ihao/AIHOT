import { useEffect, useState } from "react";
import type { BtcUsdQuote } from "@aihot/contracts/market";
import { btcQuoteDelayed, formatBtcTime, formatBtcUsd, startBtcPolling, type BtcMarketState } from "../../lib/btc-market";

export function BtcPriceBar({ initialQuote, initialNow }: { initialQuote: BtcUsdQuote | null; initialNow: number }) {
  // Cached HTML and hydration must share a clock; the mounted poller then uses the browser clock.
  const [state, setState] = useState<BtcMarketState>(() => ({ quote: initialQuote, failed: false, now: initialNow }));
  useEffect(() => startBtcPolling(initialQuote, setState), [initialQuote]);
  const { quote } = state;
  const delayed = btcQuoteDelayed(quote, state.now, state.failed);
  return (
    <aside aria-label="BTC 美元行情" className="mb-5 mt-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-accent/20 bg-accent/5 px-3.5 py-3 lg:mt-0 lg:px-4">
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-[#f7931a] text-[18px] font-bold text-white">₿</span>
        <span className="text-[12px] font-semibold text-ink-2">BTC</span>
      </span>
      <strong className="num text-[18px] font-semibold text-ink lg:text-[20px]">{quote ? formatBtcUsd(quote.priceUsd) : "行情暂不可用"}</strong>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-3 lg:ml-auto">
        <a href="https://exchange.coinbase.com/trade/BTC-USD" target="_blank" rel="noopener noreferrer" className="hover:text-accent">Coinbase</a>
        {quote && <time dateTime={quote.quotedAt} title={`本站获取时间：${formatBtcTime(quote.fetchedAt)}`}>行情时间：{formatBtcTime(quote.quotedAt)}</time>}
        {delayed && <span className="text-hot">行情更新延迟</span>}
      </div>
    </aside>
  );
}
