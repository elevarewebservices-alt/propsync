-- ── Pipelines ────────────────────────────────────────────────────────────────
-- Adds multi-pipeline support to the CRM.
-- Each company gets 3 default pipelines: Ventas, Arriendos, Proyectos.
-- crm_stages gains a pipeline_id FK so stages are scoped to a pipeline.

CREATE TABLE IF NOT EXISTS pipelines (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre       TEXT        NOT NULL,
  slug         TEXT        NOT NULL,
  color        TEXT        NOT NULL DEFAULT '#3b82f6',
  icon         TEXT        DEFAULT 'kanban',
  position     INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

ALTER TABLE crm_stages ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view their pipelines"
  ON pipelines FOR SELECT
  USING (company_id = current_company_id());

CREATE POLICY "Company members can manage their pipelines"
  ON pipelines FOR ALL
  USING (company_id = current_company_id());

-- Seed default pipelines for all existing companies
INSERT INTO pipelines (company_id, nombre, slug, color, position)
SELECT id, 'Ventas', 'ventas', '#3b82f6', 0 FROM companies
ON CONFLICT (company_id, slug) DO NOTHING;

INSERT INTO pipelines (company_id, nombre, slug, color, position)
SELECT id, 'Arriendos', 'arriendos', '#10b981', 1 FROM companies
ON CONFLICT (company_id, slug) DO NOTHING;

INSERT INTO pipelines (company_id, nombre, slug, color, position)
SELECT id, 'Proyectos', 'proyectos', '#8b5cf6', 2 FROM companies
ON CONFLICT (company_id, slug) DO NOTHING;

-- Assign existing crm_stages to the 'ventas' pipeline by default
UPDATE crm_stages cs
SET pipeline_id = (
  SELECT p.id FROM pipelines p
  WHERE p.company_id = cs.company_id AND p.slug = 'ventas'
  LIMIT 1
)
WHERE cs.pipeline_id IS NULL;
