-- Additive identity: new rounds pin rewriting before any paid request. Old rounds keep history.
ALTER TABLE automatic_verifications ADD COLUMN rewrite_model text;
ALTER TABLE automatic_verifications ADD COLUMN rewrite_config_hash text;
