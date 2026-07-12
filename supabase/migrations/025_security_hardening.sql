-- ============================================================================
-- Security hardening — close the gap between app-layer permission checks and
-- database-layer RLS.
--
-- Context: app/api/agents/[id]/route.ts, lib/auth.ts's canAccessContact() /
-- canEditProperty(), and lib/permissions.ts already enforce role- and
-- assignment-based rules — but those checks only run when a request goes
-- through the Next.js API. Every authenticated user also holds the public
-- anon key + their own session JWT in the browser, which is enough to call
-- Supabase's PostgREST API directly. Until now, RLS on `agents`, `contacts`,
-- and `properties` only checked `company_id`, so a direct call could bypass
-- every app-layer rule (e.g. a plain agente self-promoting to owner). This
-- migration mirrors the app's own rules at the RLS layer so both paths agree.
--
-- The app's own server code (API routes) always writes through the
-- service_role admin client, which bypasses RLS by design — none of this
-- changes any existing app behavior. It only closes the direct-PostgREST
-- bypass path. Confirmed via repo-wide grep that no browser-side code queries
-- these tables directly (`createBrowserClient` is only ever used for
-- `.auth.*` calls, not `.from(...)` reads/writes) — so this is safe to apply.
-- ============================================================================

-- ── Helper functions (mirror lib/auth.ts + lib/permissions.ts) ─────────────

CREATE OR REPLACE FUNCTION current_agent_id()
RETURNS UUID AS $$
  SELECT id FROM agents WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_agent_role()
RETURNS TEXT AS $$
  SELECT rol FROM agents WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Mirrors lib/permissions.ts's resolvePermissions(): owner/admin default to
-- true, agente defaults to false, and a per-agent override in
-- agents.permissions (JSONB) wins when present. Used for both
-- 'viewAllContacts' and 'editAllProperties' — same shape, same defaults.
CREATE OR REPLACE FUNCTION current_agent_permission(key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT rol, permissions INTO rec FROM agents WHERE auth_user_id = auth.uid() LIMIT 1;
  IF rec IS NULL THEN
    RETURN FALSE;
  END IF;

  IF rec.permissions IS NOT NULL AND rec.permissions ? key THEN
    RETURN (rec.permissions ->> key)::BOOLEAN;
  END IF;

  RETURN rec.rol IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── agents: role/self-modification guard (BEFORE UPDATE trigger) ───────────
-- RLS alone can't compare OLD vs NEW column values, so the fine-grained
-- rules (no self-role-change, only an owner grants owner, owner can't be
-- demoted/deactivated) live in a trigger instead. It mirrors
-- app/api/agents/[id]/route.ts's PATCH/DELETE checks exactly. service_role
-- (the app's own admin client, which already enforces these same rules in
-- JS before calling .update()) is exempted so this never affects the app's
-- normal server-side writes — it only constrains a direct PostgREST call
-- authenticated as a real user.
CREATE OR REPLACE FUNCTION enforce_agent_role_rules()
RETURNS TRIGGER AS $$
DECLARE
  actor_id   UUID;
  actor_role TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  actor_id   := current_agent_id();
  actor_role := current_agent_role();

  IF actor_role IS NULL OR actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Solo un owner o admin puede modificar agentes.';
  END IF;

  IF actor_id = NEW.id AND (
       NEW.rol IS DISTINCT FROM OLD.rol
    OR NEW.permissions IS DISTINCT FROM OLD.permissions
    OR NEW.is_active IS DISTINCT FROM OLD.is_active
  ) THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol, permisos o estado.';
  END IF;

  IF NEW.rol = 'owner' AND OLD.rol IS DISTINCT FROM 'owner' AND actor_role <> 'owner' THEN
    RAISE EXCEPTION 'Solo el propietario puede asignar el rol de propietario.';
  END IF;

  IF OLD.rol = 'owner' AND NEW.rol IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'No se puede cambiar el rol del propietario.';
  END IF;

  IF OLD.rol = 'owner' AND NEW.is_active = FALSE THEN
    RAISE EXCEPTION 'No se puede eliminar al propietario.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_agents_role_guard ON agents;
CREATE TRIGGER trg_agents_role_guard
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION enforce_agent_role_rules();

-- ── agents: replace the single "FOR ALL company_id" policy ─────────────────
DROP POLICY IF EXISTS "agents see own company agents" ON agents;

CREATE POLICY "agents_select_company"
  ON agents FOR SELECT
  USING (company_id = current_company_id());

CREATE POLICY "agents_insert_owner_admin"
  ON agents FOR INSERT
  WITH CHECK (company_id = current_company_id() AND current_agent_role() IN ('owner', 'admin'));

CREATE POLICY "agents_update_owner_admin"
  ON agents FOR UPDATE
  USING (company_id = current_company_id() AND current_agent_role() IN ('owner', 'admin'))
  WITH CHECK (company_id = current_company_id());

-- No DELETE policy: the app soft-deletes via UPDATE (is_active = false), and
-- a real DELETE should only ever happen through the service_role client
-- (which bypasses RLS), e.g. company/account deletion tooling.

-- ── contacts: scope by agente_asignado_id unless viewAllContacts ───────────
DROP POLICY IF EXISTS "agents see own company contacts" ON contacts;

CREATE POLICY "contacts_select_scoped"
  ON contacts FOR SELECT
  USING (
    company_id = current_company_id()
    AND (current_agent_permission('viewAllContacts') OR agente_asignado_id = current_agent_id())
  );

CREATE POLICY "contacts_insert_company"
  ON contacts FOR INSERT
  WITH CHECK (company_id = current_company_id());

CREATE POLICY "contacts_update_scoped"
  ON contacts FOR UPDATE
  USING (
    company_id = current_company_id()
    AND (current_agent_permission('viewAllContacts') OR agente_asignado_id = current_agent_id())
  );

CREATE POLICY "contacts_delete_scoped"
  ON contacts FOR DELETE
  USING (
    company_id = current_company_id()
    AND (current_agent_permission('viewAllContacts') OR agente_asignado_id = current_agent_id())
  );

-- ── properties: SELECT/INSERT stay company-wide (properties are visible to
-- everyone per lib/auth.ts's canEditProperty comment — only editing is
-- scoped); UPDATE/DELETE now require editAllProperties or assignment. ──────
DROP POLICY IF EXISTS "agents update own company properties" ON properties;
DROP POLICY IF EXISTS "agents delete own company properties" ON properties;

CREATE POLICY "properties_update_scoped"
  ON properties FOR UPDATE
  USING (
    company_id = current_company_id()
    AND (current_agent_permission('editAllProperties') OR agente_asignado_id = current_agent_id())
  );

CREATE POLICY "properties_delete_scoped"
  ON properties FOR DELETE
  USING (
    company_id = current_company_id()
    AND (current_agent_permission('editAllProperties') OR agente_asignado_id = current_agent_id())
  );

-- ── companies: hide sensitive credential columns from direct PostgREST
-- reads. The app never queries `companies` with anything but the service_role
-- admin client (grep-confirmed), so this only blocks a direct call using a
-- user's own session — which today could read wasi_token, the encrypted API
-- key, and every WhatsApp/Meta/TikTok webhook secret for their own company.
-- ────────────────────────────────────────────────────────────────────────
REVOKE SELECT ON companies FROM authenticated, anon;
GRANT SELECT (
  id, nombre, email, plan_id, wasi_company_id,
  created_at, updated_at,
  subscription_status, trial_ends_at, subscription_provider, current_period_end,
  whatsapp_phone_number_id, whatsapp_business_account_id,
  api_key_created_at
) ON companies TO authenticated;

-- ── billing: a PayPal subscription id must map to exactly one company ──────
-- Without this, two companies could end up sharing the same
-- subscription_external_id, and the PayPal webhook (which updates
-- `WHERE subscription_external_id = X`) would silently flip both companies'
-- billing state together on every renewal/cancellation event.
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_subscription_external_id
  ON companies (subscription_external_id)
  WHERE subscription_external_id IS NOT NULL;
