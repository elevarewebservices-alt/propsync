-- ============================================================================
-- Security hardening (part 2) — close the same app-vs-RLS gap that
-- 025_security_hardening.sql fixed for agents/contacts/properties/companies,
-- but left open for crm_stages and pipelines.
--
-- Context: app/api/crm/stages/route.ts and app/api/crm/stages/[id]/route.ts
-- (create/update/delete) and app/api/crm/pipelines/**/route.ts all gate
-- writes behind `(await getSessionPermissions()).accessSettings` — but that
-- check only runs through the Next.js API. Until now, RLS on `crm_stages`
-- and `pipelines` only checked `company_id` (a single "FOR ALL" policy), so
-- a plain `agente` without accessSettings could call Supabase's PostgREST
-- API directly with their own session and create/edit/delete pipeline
-- stages for their whole company, bypassing the app's permission gate.
--
-- Depends on current_company_id() and current_agent_permission() — both
-- created by 025_security_hardening.sql. Run 025 before this one if it
-- hasn't been applied yet.
--
-- SELECT stays company-wide (every agent needs to see stages/pipelines to
-- render the Kanban board and the contact detail funnel bar) — only
-- INSERT/UPDATE/DELETE are now scoped to accessSettings, mirroring exactly
-- what the app routes already enforce. The app's own server code always
-- writes through the service_role admin client, so this only closes the
-- direct-PostgREST bypass path — no existing app behavior changes.
-- ============================================================================

-- ── crm_stages ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "agents manage own company stages" ON crm_stages;

CREATE POLICY "crm_stages_select_company"
  ON crm_stages FOR SELECT
  USING (company_id = current_company_id());

CREATE POLICY "crm_stages_insert_settings"
  ON crm_stages FOR INSERT
  WITH CHECK (company_id = current_company_id() AND current_agent_permission('accessSettings'));

CREATE POLICY "crm_stages_update_settings"
  ON crm_stages FOR UPDATE
  USING (company_id = current_company_id() AND current_agent_permission('accessSettings'))
  WITH CHECK (company_id = current_company_id());

CREATE POLICY "crm_stages_delete_settings"
  ON crm_stages FOR DELETE
  USING (company_id = current_company_id() AND current_agent_permission('accessSettings'));

-- ── pipelines ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view their pipelines" ON pipelines;
DROP POLICY IF EXISTS "Company members can manage their pipelines" ON pipelines;

CREATE POLICY "pipelines_select_company"
  ON pipelines FOR SELECT
  USING (company_id = current_company_id());

CREATE POLICY "pipelines_insert_settings"
  ON pipelines FOR INSERT
  WITH CHECK (company_id = current_company_id() AND current_agent_permission('accessSettings'));

CREATE POLICY "pipelines_update_settings"
  ON pipelines FOR UPDATE
  USING (company_id = current_company_id() AND current_agent_permission('accessSettings'))
  WITH CHECK (company_id = current_company_id());

CREATE POLICY "pipelines_delete_settings"
  ON pipelines FOR DELETE
  USING (company_id = current_company_id() AND current_agent_permission('accessSettings'));
