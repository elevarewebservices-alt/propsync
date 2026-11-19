-- PropSync Migration 033 — Compre o Alquile via the OpenNavent (RELA) API
--
-- Compre o Alquile belongs to the Navent/QuintoAndar group. Integrators (here:
-- PropSync/Elevare, credentials in NAVENT_CLIENT_ID / NAVENT_CLIENT_SECRET env
-- vars) publish listings and read contacts through api-rela-open.navent.com.
-- Each agency is identified by a codigoInmobiliaria chosen in OUR system, which
-- Compre o Alquile links to the agency's portal account on request.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS comprealquile_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS comprealquile_codigo          TEXT,
  -- Optional publication plan name (from GET /v1/publicacion/planes) if the
  -- agency's account requires one; null = portal default.
  ADD COLUMN IF NOT EXISTS comprealquile_plan            TEXT,
  ADD COLUMN IF NOT EXISTS comprealquile_last_sync_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comprealquile_last_error      TEXT,
  ADD COLUMN IF NOT EXISTS comprealquile_leads_imported  INT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_comprealquile_codigo
  ON companies (comprealquile_codigo) WHERE comprealquile_codigo IS NOT NULL;

-- Per-listing publication state on API-integrated portals.
CREATE TABLE IF NOT EXISTS portal_listings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  portal        TEXT NOT NULL,                 -- 'comprealquile'
  external_id   TEXT,                          -- portal's idAviso
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'online', 'offline', 'error')),
  payload_hash  TEXT,                          -- skip re-sending unchanged listings
  messages      JSONB NOT NULL DEFAULT '[]'::jsonb,  -- portal errors/warnings
  synced_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, portal)
);
CREATE INDEX IF NOT EXISTS idx_portal_listings_company ON portal_listings (company_id, portal, status);

-- Agencies may read their own rows (status badges); only the service role writes.
ALTER TABLE portal_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_listings_select_own" ON portal_listings;
CREATE POLICY "portal_listings_select_own" ON portal_listings
  FOR SELECT USING (company_id = current_company_id());
