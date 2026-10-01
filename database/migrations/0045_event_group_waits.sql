-- Provider capacity is a durable wait, not an article failure or a spent grouping retry.
CREATE TABLE event_group_waits (
  article_id text PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  signal_only boolean NOT NULL DEFAULT false,
  force_regroup boolean NOT NULL DEFAULT false,
  retry_at timestamptz NOT NULL,
  queued_at timestamptz,
  error text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_group_waits_retry_idx ON event_group_waits(retry_at);
