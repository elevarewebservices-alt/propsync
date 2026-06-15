-- ============================================================================
-- PropSync — FULL CATCH-UP SCRIPT
-- ============================================================================
-- Brings a database created from the base schema.sql up to date with every
-- migration the app needs (003 → 016). Safe to run on ANY current state:
--   • Tables / columns / indexes use IF NOT EXISTS
--   • Every policy is dropped-if-exists before being (re)created
--   • Seed inserts use ON CONFLICT DO NOTHING
-- Run once in Supabase → SQL Editor.
-- ============================================================================

-- ── 003: CRM stages + contact expansion + contact↔property links ────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS meta_webhook_token TEXT UNIQUE
    DEFAULT md5(random()::text || uuid_generate_v4()::text);

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
DROP POLICY IF EXISTS "agents manage own company stages" ON crm_stages;
CREATE POLICY "agents manage own company stages"
  ON crm_stages FOR ALL USING (company_id = current_company_id());
CREATE INDEX IF NOT EXISTS idx_crm_stages_company ON crm_stages(company_id, position);

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
DROP POLICY IF EXISTS "agents manage own company links" ON contact_property_links;
CREATE POLICY "agents manage own company links"
  ON contact_property_links FOR ALL USING (company_id = current_company_id());
CREATE INDEX IF NOT EXISTS idx_contact_links_contact  ON contact_property_links(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_links_property ON contact_property_links(property_id);

INSERT INTO crm_stages (company_id, nombre, slug, color, position, is_terminal)
SELECT c.id, s.nombre, s.slug, s.color, s.pos, s.terminal
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

-- ── 003b: grants ────────────────────────────────────────────────────────────
GRANT ALL ON crm_stages TO anon, authenticated, service_role;
GRANT ALL ON contact_property_links TO anon, authenticated, service_role;
GRANT ALL ON contacts TO anon, authenticated, service_role;

-- ── 007: immutable contact notes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_nombre  TEXT NOT NULL,
  contenido     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agents see own company contact notes" ON contact_notes;
CREATE POLICY "agents see own company contact notes"
  ON contact_notes FOR SELECT USING (company_id = current_company_id());
DROP POLICY IF EXISTS "agents insert own company contact notes" ON contact_notes;
CREATE POLICY "agents insert own company contact notes"
  ON contact_notes FOR INSERT WITH CHECK (company_id = current_company_id());
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contact_notes_company ON contact_notes(company_id);

-- ── 004 / 008 / 009 / 010 / 011: property + company columns ─────────────────
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS tour_rooms           JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS commission_type      TEXT,
  ADD COLUMN IF NOT EXISTS commission_value     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS commission_notes     TEXT,
  ADD COLUMN IF NOT EXISTS ext_commission_type  TEXT,
  ADD COLUMN IF NOT EXISTS ext_commission_value NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ext_commission_notes TEXT,
  ADD COLUMN IF NOT EXISTS owner_contact_id     UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS description_prompt_template TEXT,
  ADD COLUMN IF NOT EXISTS last_wasi_sync_at TIMESTAMPTZ;

-- ── 012: WhatsApp ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL DEFAULT 'Verificación de disponibilidad',
  tipo         TEXT NOT NULL DEFAULT 'verificacion',
  status       TEXT NOT NULL DEFAULT 'inactiva',
  template_name TEXT,
  total        INTEGER NOT NULL DEFAULT 0,
  enviados     INTEGER NOT NULL DEFAULT 0,
  respondidos  INTEGER NOT NULL DEFAULT 0,
  pendientes   INTEGER NOT NULL DEFAULT 0,
  fallidos     INTEGER NOT NULL DEFAULT 0,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_company ON whatsapp_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_status  ON whatsapp_campaigns(status);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  direction       TEXT NOT NULL,
  wa_message_id   TEXT,
  phone_number    TEXT NOT NULL,
  message_type    TEXT NOT NULL DEFAULT 'text',
  body            TEXT,
  template_name   TEXT,
  status          TEXT,
  error_message   TEXT,
  raw_payload     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company  ON whatsapp_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact  ON whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_property ON whatsapp_messages(property_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_campaign ON whatsapp_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_id    ON whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone    ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created  ON whatsapp_messages(created_at DESC);

ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_campaigns_company_isolation ON whatsapp_campaigns;
CREATE POLICY whatsapp_campaigns_company_isolation ON whatsapp_campaigns
  FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());
DROP POLICY IF EXISTS whatsapp_messages_company_isolation ON whatsapp_messages;
CREATE POLICY whatsapp_messages_company_isolation ON whatsapp_messages
  FOR ALL USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS whatsapp_webhook_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_access_token_enc TEXT;

-- ── 013: pipelines ──────────────────────────────────────────────────────────
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
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can view their pipelines" ON pipelines;
CREATE POLICY "Company members can view their pipelines"
  ON pipelines FOR SELECT USING (company_id = current_company_id());
DROP POLICY IF EXISTS "Company members can manage their pipelines" ON pipelines;
CREATE POLICY "Company members can manage their pipelines"
  ON pipelines FOR ALL USING (company_id = current_company_id());

INSERT INTO pipelines (company_id, nombre, slug, color, position)
SELECT id, 'Ventas', 'ventas', '#3b82f6', 0 FROM companies
ON CONFLICT (company_id, slug) DO NOTHING;
INSERT INTO pipelines (company_id, nombre, slug, color, position)
SELECT id, 'Arriendos', 'arriendos', '#10b981', 1 FROM companies
ON CONFLICT (company_id, slug) DO NOTHING;
INSERT INTO pipelines (company_id, nombre, slug, color, position)
SELECT id, 'Proyectos', 'proyectos', '#8b5cf6', 2 FROM companies
ON CONFLICT (company_id, slug) DO NOTHING;

UPDATE crm_stages cs
SET pipeline_id = (
  SELECT p.id FROM pipelines p
  WHERE p.company_id = cs.company_id AND p.slug = 'ventas' LIMIT 1
)
WHERE cs.pipeline_id IS NULL;

-- ── 014: automations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre         TEXT        NOT NULL,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  trigger_type   TEXT        NOT NULL CHECK (trigger_type IN ('nuevo_lead', 'sin_respuesta', 'follow_up_vencido')),
  trigger_config JSONB       NOT NULL DEFAULT '{}',
  conditions     JSONB       NOT NULL DEFAULT '[]',
  actions        JSONB       NOT NULL DEFAULT '[]',
  run_count      INTEGER     NOT NULL DEFAULT 0,
  last_run_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS automation_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id  UUID        NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  company_id     UUID        NOT NULL,
  contact_id     UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  trigger_type   TEXT        NOT NULL,
  actions_run    JSONB       DEFAULT '[]',
  status         TEXT        NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'skipped')),
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS automation_logs_automation_contact_idx
  ON automation_logs (automation_id, contact_id, created_at DESC);
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company automations" ON automations;
CREATE POLICY "Company automations" ON automations FOR ALL USING (company_id = current_company_id());
DROP POLICY IF EXISTS "Company automation logs" ON automation_logs;
CREATE POLICY "Company automation logs" ON automation_logs FOR ALL USING (company_id = current_company_id());

-- ── 015: push subscriptions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_company_idx ON push_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_agent_idx ON push_subscriptions(agent_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agents_manage_own_subscriptions" ON push_subscriptions;
CREATE POLICY "agents_manage_own_subscriptions" ON push_subscriptions
  FOR ALL USING (agent_id = (SELECT id FROM agents WHERE auth_user_id = auth.uid() LIMIT 1));

-- ── 016: TikTok webhook token ───────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tiktok_webhook_token TEXT UNIQUE;
