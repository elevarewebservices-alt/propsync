-- Per-company SMTP configuration so each agency sends emails from their own address
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS smtp_host           TEXT,
  ADD COLUMN IF NOT EXISTS smtp_port           INTEGER,
  ADD COLUMN IF NOT EXISTS smtp_user           TEXT,
  ADD COLUMN IF NOT EXISTS smtp_password_enc   TEXT,
  ADD COLUMN IF NOT EXISTS smtp_from_email     TEXT,
  ADD COLUMN IF NOT EXISTS smtp_from_name      TEXT,
  ADD COLUMN IF NOT EXISTS smtp_secure         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS smtp_verified_at    TIMESTAMPTZ;
