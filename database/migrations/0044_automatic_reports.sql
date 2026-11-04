-- Automatic issues retain their own origin; terminal safety inspection is crash/restart durable.
ALTER TABLE reports DROP CONSTRAINT reports_origin_check;
ALTER TABLE reports ADD CONSTRAINT reports_origin_check CHECK (origin IN ('model','imported','manual','automatic'));
ALTER TABLE automatic_verifications ADD COLUMN safety_processed_at timestamptz;
CREATE INDEX automatic_verifications_safety_idx ON automatic_verifications(updated_at,id)
  WHERE status IN ('accepted','rejected','stale') AND safety_processed_at IS NULL;
