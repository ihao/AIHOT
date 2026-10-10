/** Coinbase Exchange BTC-USD latest trade, with the independent time this site fetched it. */
export interface BtcUsdQuote {
  priceUsd: number;
  quotedAt: string;
  fetchedAt: string;
  source: "Coinbase";
  currency: "USD";
}

export interface BtcIngestionQuote extends BtcUsdQuote {
  ingestedAt: string;
}

export interface BtcMarketResponse {
  quote: BtcUsdQuote | null;
}
