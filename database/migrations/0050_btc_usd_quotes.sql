-- Coinbase BTC-USD snapshots are append-only; article references retain the first ingestion quote.
CREATE TABLE btc_usd_quotes (
  id bigserial PRIMARY KEY,
  price_usd numeric(20, 8) NOT NULL CHECK (price_usd > 0 AND price_usd < 1000000000000),
  trade_id bigint NOT NULL CHECK (trade_id > 0),
  quoted_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL
);
CREATE INDEX btc_usd_quotes_latest_idx ON btc_usd_quotes (fetched_at DESC, id DESC);

-- Historical rows deliberately remain unknown, rather than receiving a fabricated price/time.
ALTER TABLE articles ADD COLUMN ingested_at timestamptz;
ALTER TABLE articles ADD COLUMN btc_quote_id bigint REFERENCES btc_usd_quotes (id);
