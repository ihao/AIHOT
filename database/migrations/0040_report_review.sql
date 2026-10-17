-- A report identity is never publication authority. Existing AIHOT rows keep
-- their legacy content for audit but have no active version and are invisible.
ALTER TABLE reports ADD COLUMN active_version_id bigint;

CREATE TABLE report_drafts (
  id                bigserial PRIMARY KEY,
  report_id         bigint NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  window_start      timestamptz NOT NULL,
  cutoff            timestamptz NOT NULL,
  content           jsonb NOT NULL,
  candidate_set     jsonb NOT NULL,
  candidate_hash    text NOT NULL,
  model             text,
  created_by        text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (window_start < cutoff)
);
CREATE INDEX report_drafts_issue_idx ON report_drafts (report_id, id DESC);

CREATE TABLE report_versions (
  id                bigserial PRIMARY KEY,
  report_id         bigint NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  version           integer NOT NULL CHECK (version > 0),
  draft_id          bigint NOT NULL UNIQUE REFERENCES report_drafts (id),
  window_start      timestamptz NOT NULL,
  window_end        timestamptz NOT NULL,
  content           jsonb NOT NULL,
  candidate_hash    text NOT NULL,
  citations         jsonb NOT NULL,
  model             text,
  published_by      text NOT NULL,
  reason            text NOT NULL,
  published_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, version),
  UNIQUE (report_id, id),
  CHECK (window_start < window_end)
);
ALTER TABLE reports ADD CONSTRAINT reports_active_version_fk
  FOREIGN KEY (id, active_version_id) REFERENCES report_versions (report_id, id);

-- A deployment timestamp is the first possible reporting cutoff. Editors may
-- set this explicitly before the first issue if they need an earlier window.
INSERT INTO settings (key, value, updated_by)
VALUES ('report_launch_start', jsonb_build_object('at', now()), 'migration')
ON CONFLICT (key) DO NOTHING;

CREATE VIEW published_reports AS
SELECT r.id, r.kind, r.key, v.window_start, v.window_end, v.content,
       v.published_at AS generated_at, v.version AS revision, v.model,
       v.citations, v.candidate_hash
FROM reports r JOIN report_versions v ON v.id = r.active_version_id AND v.report_id = r.id;
