-- PropSync Migration 031 — outbound XML feeds for real-estate portals
--
-- Each company gets a secret, revocable feed token. Portals (Encuentra24,
-- Compre o Alquile, …) pull https://<host>/feeds/<feed_token>/<portal>.xml on
-- their own schedule (typically every ~24h) and publish whatever listings it
-- contains — so no PropSync-side server/worker is needed to "push" anything.
--
-- feed_last_access records when each portal last fetched its feed
-- ({"encuentra24": "2026-11-18T06:00:00Z", ...}) so the agency (and the
-- Elevare admin panel) can confirm the portal is actually reading it.
--
-- Neither column is added to the authenticated-role column GRANT from
-- migration 025, so they stay invisible to direct PostgREST reads; only the
-- service-role admin client (server side) touches them.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS feed_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS feed_last_access JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Feed query: one company's publishable listings.
CREATE INDEX IF NOT EXISTS idx_properties_company_publicacion
  ON properties (company_id, estado_publicacion, disponibilidad);
