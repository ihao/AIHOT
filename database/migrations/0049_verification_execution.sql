-- Existing rounds retain their exact model payload and receipt identity.
ALTER TABLE automatic_verifications ADD COLUMN execution_policy text NOT NULL DEFAULT 'legacy-v1'
  CHECK (execution_policy IN ('legacy-v1','bounded-v1'));

-- Assessment and deployment must explicitly activate the fixed ordinary-official scope.
INSERT INTO settings(key,value) VALUES ('verification.routing',
  '{"enabled":false,"ordinaryModel":"dashscope-deepseek-v4.1-flash"}')
  ON CONFLICT(key) DO NOTHING;
