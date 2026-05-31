ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS commission_type      TEXT,
  ADD COLUMN IF NOT EXISTS commission_value     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS commission_notes     TEXT,
  ADD COLUMN IF NOT EXISTS ext_commission_type  TEXT,
  ADD COLUMN IF NOT EXISTS ext_commission_value NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ext_commission_notes TEXT;
