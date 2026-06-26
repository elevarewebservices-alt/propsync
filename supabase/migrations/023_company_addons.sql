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

CREATE POLICY "Company addons" ON company_addons FOR ALL USING (company_id = current_company_id());
