import type { BtcIngestionQuote } from "@aihot/contracts/market";
import { formatBtcTime, formatBtcUsd } from "../../lib/btc-market";

export function BtcIngestionPrice({ quote, detail = false }: { quote?: BtcIngestionQuote | null; detail?: boolean }) {
  return (
    <div className={`text-[12px] leading-relaxed text-ink-4 ${detail ? "mt-6 rounded-control border border-line-soft px-4 py-3" : "mt-3 border-t border-line-soft pt-2"}`}>
      <p>入库时 BTC：<span className="num text-ink-3">{quote ? formatBtcUsd(quote.priceUsd) : "暂缺"}</span></p>
      {quote && (detail ? (
        <p className="mt-1">入库时间：<time dateTime={quote.ingestedAt}>{formatBtcTime(quote.ingestedAt)}</time><br />
          行情时间：<time dateTime={quote.quotedAt}>{formatBtcTime(quote.quotedAt)}</time> · 来源：{quote.source}</p>
      ) : <p className="mt-0.5" title={`入库时间：${formatBtcTime(quote.ingestedAt)}；行情时间：${formatBtcTime(quote.quotedAt)}`}>行情时间：{formatBtcTime(quote.quotedAt)} · {quote.source}</p>)}
    </div>
  );
}
