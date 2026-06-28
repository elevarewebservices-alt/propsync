-- 15-day free trial + subscription state + promo codes.
--
-- SECURITY: the trial/subscription columns live on `companies`, which has RLS
-- enabled with ONLY a SELECT policy (see schema.sql) — there is intentionally no
-- UPDATE policy, so the anon/authenticated PostgREST roles CANNOT change their
-- own subscription_status/trial_ends_at. Only the server's service_role (which
-- bypasses RLS) flips these, and only after a verified PayPal webhook or an
-- admin action. This is what makes the trial non-bypassable from the client.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subscription_status      TEXT,          -- NULL = grandfathered/active; else 'trialing' | 'active' | 'past_due' | 'canceled'
  ADD COLUMN IF NOT EXISTS trial_ends_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_provider    TEXT,          -- 'paypal'
  ADD COLUMN IF NOT EXISTS subscription_external_id TEXT,          -- PayPal subscription id
  ADD COLUMN IF NOT EXISTS current_period_end       TIMESTAMPTZ;

-- Platform-wide promotional codes (created by the platform owner, shared with
-- prospects, applied at signup/checkout).
CREATE TABLE IF NOT EXISTS promo_codes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT        NOT NULL UNIQUE,
  descripcion      TEXT,
  trial_extra_days INTEGER     NOT NULL DEFAULT 0,   -- extend the free trial
  discount_percent INTEGER     NOT NULL DEFAULT 0,   -- % off the price
  free_months      INTEGER     NOT NULL DEFAULT 0,   -- months fully free
  max_uses         INTEGER,                          -- NULL = unlimited
  uses             INTEGER     NOT NULL DEFAULT 0,
  activo           BOOLEAN     NOT NULL DEFAULT true,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One redemption per company per code.
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID        NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (promo_code_id, company_id)
);

ALTER TABLE promo_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

-- No policies at all: promo codes are validated, redeemed and counted ONLY on
-- the server (service_role). Clients can't enumerate codes, self-redeem, or
-- tamper with `uses` — every redemption goes through the server, which checks
-- active/expiry/max_uses atomically.

CREATE INDEX IF NOT EXISTS promo_codes_code_idx ON promo_codes (code);
CREATE INDEX IF NOT EXISTS promo_redemptions_company_idx ON promo_redemptions (company_id);
