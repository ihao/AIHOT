-- Existing rounds retain their exact model payload and receipt identity.
ALTER TABLE automatic_verifications ADD COLUMN execution_policy text NOT NULL DEFAULT 'legacy-v1'
  CHECK (execution_policy IN ('legacy-v1','bounded-v1'));
-- Ordinary rounds may only upgrade to the verifier captured at queue time. Later admin changes
-- cannot change the recovery model; legacy rows do not require a fallback.
ALTER TABLE automatic_verifications ADD COLUMN fallback_model text,
  ADD COLUMN fallback_config_hash text,
  ADD CONSTRAINT automatic_verifications_fallback_pair_check
    CHECK ((fallback_model IS NULL) = (fallback_config_hash IS NULL));

-- Assessment and deployment must explicitly activate the fixed ordinary-official scope.
INSERT INTO settings(key,value) VALUES ('verification.routing',
  '{"enabled":false,"ordinaryModel":"dashscope-deepseek-v4.1-flash"}')
  ON CONFLICT(key) DO NOTHING;
