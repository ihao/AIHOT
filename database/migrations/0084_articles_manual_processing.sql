-- Explicit extraction approval survives queue recovery without changing paid request identity.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS manual_processing boolean NOT NULL DEFAULT false;
