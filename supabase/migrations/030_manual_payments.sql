-- Manual payment log for accounts billed outside PayPal (ACH, cash, etc.).
--
-- The Elevare admin panel (/panel-elevare) records each payment here and, in
-- the same request, extends companies.current_period_end. lib/subscription.ts
-- locks a non-PayPal 'active' account once that date (+ grace) passes.
--
-- SECURITY: RLS on with NO policies — same model as promo_codes. Only the
-- server (service_role) can read or write; tenants can't see or forge payments.

CREATE TABLE IF NOT EXISTS manual_payments (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount           NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  method           TEXT          NOT NULL DEFAULT 'ach'
                                 CHECK (method IN ('ach', 'cash', 'paypal', 'other')),
  reference        TEXT,
  period_start     TIMESTAMPTZ   NOT NULL,
  period_end       TIMESTAMPTZ   NOT NULL,
  notes            TEXT,
  created_by_email TEXT          NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS manual_payments_company_idx ON manual_payments (company_id, created_at DESC);
