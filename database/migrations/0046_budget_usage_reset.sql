-- Reset admission accounting without deleting paid attempts.
ALTER TABLE budgets ADD COLUMN usage_reset_at timestamptz;
