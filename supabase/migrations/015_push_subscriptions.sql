-- Push notification subscriptions
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

CREATE POLICY "agents_manage_own_subscriptions" ON push_subscriptions
  FOR ALL USING (agent_id = (
    SELECT id FROM agents WHERE auth_user_id = auth.uid() LIMIT 1
  ));
