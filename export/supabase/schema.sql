-- ============================================================================
-- WhatsApp Sales Assistant — esquema base
-- Correr en Supabase → SQL Editor
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Agentes (clientes del producto) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre                    TEXT NOT NULL,
  agencia                   TEXT,
  email                     TEXT UNIQUE,
  -- Número de WhatsApp Business de este agente (clave multi-tenant)
  whatsapp_phone_number_id  TEXT UNIQUE,
  plan_id                   TEXT NOT NULL DEFAULT 'basico',
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Propiedades (inventario local; opcional si se usa PropSync) ──────────────
CREATE TABLE IF NOT EXISTS properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  precio          NUMERIC(15,2) NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'venta',   -- 'venta' | 'arriendo'
  tipo_inmueble   TEXT,
  zona            TEXT,
  ciudad          TEXT,
  bedrooms        SMALLINT,
  bathrooms       SMALLINT,
  disponibilidad  TEXT NOT NULL DEFAULT 'disponible',
  public_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Leads (prospectos que escriben por WhatsApp) ────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  telefono        TEXT NOT NULL,
  nombre          TEXT,
  tipo_operacion  TEXT,            -- 'compra' | 'alquiler'
  tipo_inmueble   TEXT,
  zona            TEXT,
  presupuesto_max NUMERIC(15,2),
  estado          TEXT NOT NULL DEFAULT 'nuevo',   -- nuevo | calificado | caliente
  escalado        BOOLEAN NOT NULL DEFAULT FALSE,
  escalado_motivo TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_agent_lead UNIQUE (agent_id, telefono)
);

-- ── Mensajes (historial de conversación) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,       -- 'user' | 'assistant'
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Visitas agendadas ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  preferencia TEXT,
  status      TEXT NOT NULL DEFAULT 'pendiente',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_lead    ON messages(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_agent      ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_agent ON properties(agent_id);

-- ── Mantener updated_at en leads ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_touch ON leads;
CREATE TRIGGER trg_leads_touch BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
