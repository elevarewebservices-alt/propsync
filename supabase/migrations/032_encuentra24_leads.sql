-- PropSync Migration 032 — Encuentra24 leads → CRM
--
-- Each agency connects its own Encuentra24 account (slug + API key from the
-- Encuentra24 CRM API). /api/cron/encuentra24-leads pulls new leads every few
-- minutes and creates CRM contacts with fuente = 'encuentra24'.
--
-- The new companies columns are NOT added to the authenticated-role column
-- GRANT from migration 025, so — like wasi_token — they're only readable by the
-- service-role admin client on the server.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS encuentra24_api_key        TEXT,
  ADD COLUMN IF NOT EXISTS encuentra24_slug           TEXT,
  -- Encuentra24 created_at (unix seconds) of the newest lead already processed.
  ADD COLUMN IF NOT EXISTS encuentra24_last_lead_at   BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS encuentra24_last_sync_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS encuentra24_last_error     TEXT,
  ADD COLUMN IF NOT EXISTS encuentra24_leads_imported INT NOT NULL DEFAULT 0;

-- Portal sources for contacts. The original CHECK was declared inline (003 /
-- 018), so Postgres auto-named it — drop every CHECK on contacts that mentions
-- fuente rather than guessing the name.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.contacts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%fuente%'
  LOOP
    EXECUTE format('ALTER TABLE public.contacts DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE contacts ADD CONSTRAINT contacts_fuente_check
  CHECK (fuente IN ('manual','meta_leads','web_form','referido','wasi','encuentra24','comprealquile','inmotech'));

-- The portal's own lead id. Unique per company + source, so re-running a batch
-- (retries, overlapping cron runs) can never create the same contact twice.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_company_fuente_external_ref
  ON contacts (company_id, fuente, external_ref)
  WHERE external_ref IS NOT NULL;
