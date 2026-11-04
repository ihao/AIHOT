-- Decisions are independent of the legacy public projection. An absent row means pending;
-- migration deliberately creates no approval from publications or existing sources.
CREATE TABLE editorial_reviews (
  article_id             text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  status                 text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_public')),
  fingerprint            text,
  article_revision       integer,
  analysis_id            bigint REFERENCES analyses (id) ON DELETE CASCADE,
  override_version       integer NOT NULL DEFAULT 0,
  source_policy_version  integer NOT NULL DEFAULT 0,
  version                integer NOT NULL DEFAULT 1 CHECK (version > 0),
  reviewed_by            text,
  reason                 text,
  reviewed_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'pending' OR (fingerprint IS NOT NULL AND article_revision IS NOT NULL AND analysis_id IS NOT NULL)),
  CHECK (status = 'pending' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX editorial_reviews_queue_idx ON editorial_reviews (updated_at, article_id) WHERE status = 'pending';

-- A separate, exact-version curation decision is needed for home, events and reports.
-- Auto-public never creates this grant.
CREATE TABLE editorial_curations (
  article_id       text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  fingerprint      text,
  review_version   integer,
  version          integer NOT NULL DEFAULT 1 CHECK (version > 0),
  reviewed_by      text,
  reason           text,
  reviewed_at      timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'approved' OR (fingerprint IS NOT NULL AND review_version IS NOT NULL AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

-- No rows are inserted by migration; every source starts with auto-public off.
CREATE TABLE source_auto_public_policies (
  source_id     text PRIMARY KEY REFERENCES sources (id) ON DELETE CASCADE,
  enabled       boolean NOT NULL DEFAULT false,
  version       integer NOT NULL DEFAULT 1 CHECK (version > 0),
  changed_by    text NOT NULL,
  reason        text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
