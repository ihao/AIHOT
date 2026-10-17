-- A round belongs to the original revision and scoring/verification rules, not a rerun analysis ID.
-- Terminal rows are never reset by queue sweeps or a new judgement of the same input.
CREATE TABLE automatic_verifications (
  id bigserial PRIMARY KEY,
  article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  article_revision integer NOT NULL,
  analysis_id bigint NOT NULL REFERENCES analyses(id),
  automatic_rule_version text NOT NULL,
  verification_model text NOT NULL,
  verification_config_hash text NOT NULL,
  source_policy_version integer NOT NULL,
  original_fingerprint text,
  final_fingerprint text,
  evidence_links jsonb NOT NULL DEFAULT '[]',
  original_copy_hash text NOT NULL,
  final_copy_hash text NOT NULL,
  original_copy jsonb NOT NULL,
  final_copy jsonb NOT NULL,
  materials jsonb NOT NULL,
  receipt_ids bigint[] NOT NULL DEFAULT '{}',
  stage text NOT NULL DEFAULT 'initial' CHECK(stage IN ('initial','evidence','rewrite')),
  evidence_fetched boolean NOT NULL DEFAULT false,
  rewritten boolean NOT NULL DEFAULT false,
  verification_count integer NOT NULL DEFAULT 0 CHECK(verification_count BETWEEN 0 AND 3),
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','waiting','accepted','rejected','stale')),
  selected boolean NOT NULL DEFAULT false,
  verification jsonb,
  decisions jsonb NOT NULL DEFAULT '[]',
  reasons jsonb NOT NULL DEFAULT '[]',
  failures integer NOT NULL DEFAULT 0,
  lease_token text,
  lease_until timestamptz,
  retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(article_id,article_revision,automatic_rule_version)
);
CREATE INDEX automatic_verifications_work_idx ON automatic_verifications(status,retry_at,lease_until)
 WHERE status IN ('queued','waiting','running');
-- Membership-only changes are restored synchronously, with no paid requests. This records the
-- membership version that was restored so restart/regroup retries cannot create another grant.
CREATE TABLE automatic_curation_restorations (
  article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  verification_id bigint NOT NULL REFERENCES automatic_verifications(id) ON DELETE CASCADE,
  membership_hash text NOT NULL,
  restored_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(article_id,verification_id,membership_hash)
);
