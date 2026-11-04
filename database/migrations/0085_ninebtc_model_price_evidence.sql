-- Site-owned price evidence; the 0051 site preflight archives old metadata before its removal.
CREATE TABLE IF NOT EXISTS ninebtc_model_price_evidence (
  service text NOT NULL,
  model text NOT NULL,
  per_request numeric,
  verified_on date,
  source_url text,
  note text,
  PRIMARY KEY (service, model)
);
