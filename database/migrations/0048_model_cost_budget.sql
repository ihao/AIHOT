-- Opt-in, shared model budget. Operators verify CNY service_prices before enabling it.
-- Existing receipts, attempts, request-count budgets and their reset history are preserved.
CREATE TABLE model_cost_policy (
  id smallint PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'Asia/Shanghai' CHECK (timezone = 'Asia/Shanghai'),
  day_limit_cny numeric(20,9) NOT NULL DEFAULT 9 CHECK (day_limit_cny >= 0),
  rolling_limit_cny numeric(20,9) NOT NULL DEFAULT 9 CHECK (rolling_limit_cny >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO model_cost_policy (id) VALUES (1);

ALTER TABLE receipt_attempts
  ADD COLUMN model_cost_reserved_cny numeric(20,9) CHECK (model_cost_reserved_cny >= 0),
  ADD COLUMN model_cost_cny numeric(20,9) CHECK (model_cost_cny >= 0),
  ADD COLUMN model_cost_state text CHECK (model_cost_state IN ('reserved','estimated','retained','released')),
  ADD COLUMN model_cost_price jsonb,
  ADD COLUMN model_cost_bounds jsonb,
  ADD COLUMN model_cost_note text;
CREATE INDEX receipt_attempts_model_cost_window_idx ON receipt_attempts (started_at)
  WHERE origin = 'live' AND (model IS NOT NULL OR service IN ('llm','embedding','dashscope','deepseek','zhipu','mimo'));
