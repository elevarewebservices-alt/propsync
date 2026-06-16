-- ============================================================
-- PropSync — Supabase Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Companies (one per inmobiliaria) ─────────────────────────
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  email         TEXT UNIQUE,
  plan_id       TEXT NOT NULL DEFAULT 'starter', -- starter | pro | agency
  wasi_token    TEXT,
  wasi_company_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Agents (users that belong to a company) ──────────────────
CREATE TABLE agents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL,
  telefono      TEXT,
  rol           TEXT NOT NULL DEFAULT 'agente', -- agente | admin | owner
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Contacts / Clients ────────────────────────────────────────
CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  email         TEXT,
  telefono      TEXT,
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Properties ───────────────────────────────────────────────
CREATE TYPE property_tipo AS ENUM ('venta', 'arriendo');
CREATE TYPE etapa_crm AS ENUM ('prospecto', 'contactado', 'visita', 'oferta', 'negociando', 'cerrado');

CREATE TABLE properties (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  wasi_id               TEXT,                          -- null for manual entries

  -- Listing basics
  titulo                TEXT NOT NULL,
  descripcion           TEXT,
  address               TEXT,
  reference             TEXT,

  -- Operation
  tipo                  property_tipo NOT NULL,
  for_sale              BOOLEAN DEFAULT FALSE,
  for_rent              BOOLEAN DEFAULT FALSE,
  for_transfer          BOOLEAN DEFAULT FALSE,

  -- Classification
  property_type_label   TEXT,
  property_condition_label TEXT,

  -- Location
  country_label         TEXT DEFAULT 'Panamá',
  region_label          TEXT,
  ciudad                TEXT,
  zona                  TEXT,
  latitude              TEXT,
  longitude             TEXT,
  zip_code              TEXT,
  floor                 TEXT,

  -- Pricing
  precio                NUMERIC(15,2) NOT NULL,
  iso_currency          TEXT DEFAULT 'USD',
  sale_price            NUMERIC(15,2),
  rent_price            NUMERIC(15,2),
  maintenance_fee       NUMERIC(15,2),
  rents_type_label      TEXT,

  -- Physical
  area                  TEXT,
  built_area            TEXT,
  private_area          TEXT,
  bedrooms              SMALLINT,
  bathrooms             SMALLINT,
  half_bathrooms        SMALLINT,
  garages               SMALLINT,
  furnished             BOOLEAN,
  building_date         TEXT,

  -- Status
  estado_publicacion    TEXT NOT NULL DEFAULT 'activo'
                          CHECK (estado_publicacion IN ('activo', 'destacado', 'inactivo')),
  disponibilidad        TEXT NOT NULL DEFAULT 'disponible'
                          CHECK (disponibilidad IN ('disponible', 'vendido', 'alquilado')),
  id_status_on_page     TEXT,
  id_availability       TEXT,
  availability_label    TEXT,
  visits                INTEGER DEFAULT 0,
  network_share         BOOLEAN DEFAULT FALSE,

  -- Media
  main_image_url        TEXT,                          -- R2 URL
  gallery_urls          JSONB DEFAULT '[]',            -- array of R2 URLs
  video                 TEXT,

  -- Features
  features_internal     JSONB DEFAULT '[]',            -- [{id, nombre}]
  features_external     JSONB DEFAULT '[]',

  -- CRM
  etapa_crm             etapa_crm NOT NULL DEFAULT 'prospecto',
  cliente_nombre        TEXT,
  cliente_email         TEXT,
  agente_asignado_id    UUID REFERENCES agents(id) ON DELETE SET NULL,
  fecha_seguimiento     DATE,
  notas                 TEXT,
  brevo_deal_id         TEXT,

  -- Publishing
  canales_publicados    TEXT[] DEFAULT '{}',
  whatsapp_estado       TEXT DEFAULT 'no_contactado',
  telefono_propietario  TEXT,

  -- Meta
  fuente                TEXT NOT NULL DEFAULT 'manual', -- manual | wasi
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_wasi_property UNIQUE (company_id, wasi_id)
);

-- ── Property Notes (immutable log) ──────────────────────────
CREATE TABLE property_notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_nombre  TEXT NOT NULL,
  contenido     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — notes are immutable
);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE companies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties    ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION current_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM agents
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Companies: agent can only see their own company
CREATE POLICY "agents see own company"
  ON companies FOR SELECT
  USING (id = current_company_id());

-- Agents: only see agents from same company
CREATE POLICY "agents see own company agents"
  ON agents FOR ALL
  USING (company_id = current_company_id());

-- Contacts: only see own company contacts
CREATE POLICY "agents see own company contacts"
  ON contacts FOR ALL
  USING (company_id = current_company_id());

-- Properties: only see own company properties
CREATE POLICY "agents see own company properties"
  ON properties FOR SELECT
  USING (company_id = current_company_id());

CREATE POLICY "agents insert own company properties"
  ON properties FOR INSERT
  WITH CHECK (company_id = current_company_id());

CREATE POLICY "agents update own company properties"
  ON properties FOR UPDATE
  USING (company_id = current_company_id());

CREATE POLICY "agents delete own company properties"
  ON properties FOR DELETE
  USING (company_id = current_company_id());

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_properties_company ON properties(company_id);
CREATE INDEX idx_properties_estado_pub ON properties(company_id, estado_publicacion);
CREATE INDEX idx_properties_disponibilidad ON properties(company_id, disponibilidad);
CREATE INDEX idx_properties_etapa   ON properties(company_id, etapa_crm);
CREATE INDEX idx_properties_wasi    ON properties(company_id, wasi_id);
CREATE INDEX idx_agents_company     ON agents(company_id);
CREATE INDEX idx_agents_auth_user   ON agents(auth_user_id);
CREATE INDEX idx_contacts_company   ON contacts(company_id);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
