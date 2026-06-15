-- ============================================================================
-- Fix: "permission denied for table ..." (PostgREST error 42501)
-- ============================================================================
-- Several migrations created tables without granting privileges to the
-- Supabase roles. This grants table/sequence privileges to all three roles
-- and sets default privileges so future tables are covered automatically.
--
-- Security note: RLS policies remain the row-level boundary for anon/
-- authenticated. service_role (server-only secret key) bypasses RLS by design.
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
