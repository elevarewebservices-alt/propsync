-- ── Automation Engine ────────────────────────────────────────────────────────
-- Rule-based CRM automations: trigger → conditions → actions

CREATE TABLE IF NOT EXISTS automations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre         TEXT        NOT NULL,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  trigger_type   TEXT        NOT NULL CHECK (trigger_type IN ('nuevo_lead', 'sin_respuesta', 'follow_up_vencido')),
  trigger_config JSONB       NOT NULL DEFAULT '{}',   -- { dias: 3 }
  conditions     JSONB       NOT NULL DEFAULT '[]',   -- [{ field, op, value }]
  actions        JSONB       NOT NULL DEFAULT '[]',   -- [{ type, config }]
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

-- RLS
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company automations" ON automations FOR ALL USING (company_id = current_company_id());
CREATE POLICY "Company automation logs" ON automation_logs FOR ALL USING (company_id = current_company_id());
