-- ============================================================
-- PropSync Migration 003 — CRM Stages + Contact Expansion
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Add webhook token to companies (for Meta Lead Ads)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS meta_webhook_token TEXT UNIQUE
    DEFAULT md5(random()::text || uuid_generate_v4()::text);

-- 2. Configurable CRM stages (per company)
CREATE TABLE IF NOT EXISTS crm_stages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  slug              TEXT NOT NULL,
  color             TEXT NOT NULL DEFAULT '#6b7280',
  position          SMALLINT NOT NULL DEFAULT 0,
  is_terminal       BOOLEAN NOT NULL DEFAULT FALSE,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  required_fields   JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stage_slug UNIQUE (company_id, slug)
);

ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents manage own company stages"
  ON crm_stages FOR ALL
  USING (company_id = current_company_id());

CREATE INDEX IF NOT EXISTS idx_crm_stages_company ON crm_stages(company_id, position);

-- 3. Expand contacts table with all CRM fields
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS tipo              TEXT NOT NULL DEFAULT 'cliente'
    CHECK (tipo IN ('cliente','propietario','broker')),
  ADD COLUMN IF NOT EXISTS whatsapp          TEXT,
  ADD COLUMN IF NOT EXISTS pais              TEXT DEFAULT 'Panamá',
  ADD COLUMN IF NOT EXISTS ciudad            TEXT,
  ADD COLUMN IF NOT EXISTS zona_interes      TEXT,
  ADD COLUMN IF NOT EXISTS tipo_operacion    TEXT DEFAULT 'compra'
    CHECK (tipo_operacion IN ('compra','alquiler','ambas')),
  ADD COLUMN IF NOT EXISTS presupuesto_min   NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS presupuesto_max   NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS etapa_crm         TEXT NOT NULL DEFAULT 'nuevo_lead',
  ADD COLUMN IF NOT EXISTS agente_asignado_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agente_nombre     TEXT,
  ADD COLUMN IF NOT EXISTS fecha_seguimiento DATE,
  ADD COLUMN IF NOT EXISTS fuente            TEXT NOT NULL DEFAULT 'manual'
    CHECK (fuente IN ('manual','meta_leads','web_form','referido','wasi')),
  ADD COLUMN IF NOT EXISTS meta_campaign     TEXT,
  ADD COLUMN IF NOT EXISTS meta_form         TEXT,
  ADD COLUMN IF NOT EXISTS meta_ad_set       TEXT,
  ADD COLUMN IF NOT EXISTS tags              TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_contacts_company_etapa  ON contacts(company_id, etapa_crm);
CREATE INDEX IF NOT EXISTS idx_contacts_company_tipo   ON contacts(company_id, tipo);
CREATE INDEX IF NOT EXISTS idx_contacts_company_fuente ON contacts(company_id, fuente);
CREATE INDEX IF NOT EXISTS idx_contacts_tags           ON contacts USING GIN (tags);

-- 4. Contact ↔ Property links (many-to-many)
CREATE TABLE IF NOT EXISTS contact_property_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  interes     TEXT DEFAULT 'interesado'
    CHECK (interes IN ('interesado','propietario','visitó','ofertó','descartado')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_contact_property UNIQUE (contact_id, property_id)
);

ALTER TABLE contact_property_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents manage own company links"
  ON contact_property_links FOR ALL
  USING (company_id = current_company_id());

CREATE INDEX IF NOT EXISTS idx_contact_links_contact  ON contact_property_links(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_links_property ON contact_property_links(property_id);

-- 5. Seed 7 default stages for all existing companies
INSERT INTO crm_stages (company_id, nombre, slug, color, position, is_terminal)
SELECT
  c.id,
  s.nombre,
  s.slug,
  s.color,
  s.pos,
  s.terminal
FROM companies c
CROSS JOIN (VALUES
  ('Nuevo Lead',         'nuevo_lead',        '#3b82f6', 0, false),
  ('Contactado',         'contactado',        '#f59e0b', 1, false),
  ('Visita Programada',  'visita',            '#8b5cf6', 2, false),
  ('Oferta / Negociando','oferta_negociando', '#f97316', 3, false),
  ('Cerrado',            'cerrado',           '#22c55e', 4, true),
  ('Descartado',         'descartado',        '#6b7280', 5, true),
  ('Basurero',           'basurero',          '#ef4444', 6, true)
) AS s(nombre, slug, color, pos, terminal)
ON CONFLICT (company_id, slug) DO NOTHING;
