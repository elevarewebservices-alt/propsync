-- Paid add-ons stacked on top of a plan (e.g. "marketing": WhatsApp templates +
-- bulk email, +$40/mes on top of Pro). Modeled as its own table instead of a
-- boolean column on companies so future add-ons don't each need a migration.
CREATE TABLE IF NOT EXISTS company_addons (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  addon_id    TEXT        NOT NULL,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, addon_id)
);

CREATE INDEX IF NOT EXISTS company_addons_company_idx ON company_addons (company_id);

ALTER TABLE company_addons ENABLE ROW LEVEL SECURITY;

-- SECURITY: add-on activation is a BILLING decision — it must NEVER be
-- self-grantable by the customer. A company may only READ its own add-on
-- status; all writes (INSERT/UPDATE/DELETE) are intentionally left WITHOUT a
-- policy, so they are denied for the anon/authenticated roles even though
-- migration 019 granted table privileges. Only the server's service_role key
-- (which bypasses RLS) can activate/deactivate an add-on. This prevents a
-- logged-in user from POSTing directly to PostgREST to grant themselves the
-- paid Marketing add-on for free.
CREATE POLICY "Company addons read-only" ON company_addons
  FOR SELECT USING (company_id = current_company_id());
-- No INSERT policy   ← activation is server-only (billing)
-- No UPDATE policy   ← cannot flip activo from the client
-- No DELETE policy   ← cannot remove the gate from the client
