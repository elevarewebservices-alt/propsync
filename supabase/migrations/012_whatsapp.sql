-- WhatsApp Business API integration tables

-- Tabla de campañas de WhatsApp (verificación de disponibilidad, marketing, etc.)
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL DEFAULT 'Verificación de disponibilidad',
  tipo         TEXT NOT NULL DEFAULT 'verificacion', -- verificacion | marketing | seguimiento
  status       TEXT NOT NULL DEFAULT 'inactiva',     -- inactiva | activa | pausada | completada
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

-- Tabla de mensajes WhatsApp (inbound + outbound)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  direction       TEXT NOT NULL,           -- inbound | outbound
  wa_message_id   TEXT,                    -- ID de Meta para deduplicación
  phone_number    TEXT NOT NULL,
  message_type    TEXT NOT NULL DEFAULT 'text', -- text | template | image | audio | document
  body            TEXT,
  template_name   TEXT,
  status          TEXT,                    -- sent | delivered | read | failed (para outbound)
  error_message   TEXT,
  raw_payload     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company   ON whatsapp_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact   ON whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_property  ON whatsapp_messages(property_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_campaign  ON whatsapp_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_id     ON whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone     ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created   ON whatsapp_messages(created_at DESC);

-- RLS para multi-tenancy
ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Política: los agentes solo ven datos de su empresa
DROP POLICY IF EXISTS whatsapp_campaigns_company_isolation ON whatsapp_campaigns;
CREATE POLICY whatsapp_campaigns_company_isolation ON whatsapp_campaigns
  FOR ALL
  USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());

DROP POLICY IF EXISTS whatsapp_messages_company_isolation ON whatsapp_messages;
CREATE POLICY whatsapp_messages_company_isolation ON whatsapp_messages
  FOR ALL
  USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());

-- Token de webhook por empresa (similar al meta_webhook_token)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS whatsapp_webhook_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_access_token_enc TEXT;
