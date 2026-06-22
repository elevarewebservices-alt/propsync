-- Per-company API key for programmatic data export (REST), similar to Wasi.
-- api_key_hash is a SHA-256 digest used for fast lookup on incoming requests.
-- api_key_enc is the AES-256-GCM encrypted plaintext, decrypted only when the
-- owner clicks "reveal" in configuracion/general — never returned otherwise.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS api_key_enc TEXT,
  ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_api_key_hash ON companies(api_key_hash);
