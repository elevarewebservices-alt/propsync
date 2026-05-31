-- Monthly assistant request counter per company
-- Resets automatically each calendar month (new month = no row yet = count 0)

CREATE TABLE IF NOT EXISTS assistant_usage (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month         CHAR(7) NOT NULL,   -- 'YYYY-MM'
  request_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_assistant_usage UNIQUE (company_id, month)
);

ALTER TABLE assistant_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents read own usage"
  ON assistant_usage FOR SELECT
  USING (company_id = current_company_id());

CREATE INDEX idx_assistant_usage_company_month ON assistant_usage(company_id, month);
