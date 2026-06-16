-- ============================================================
-- PropSync Migration 003b — Grant permissions on new CRM tables
-- Run this immediately after 003_crm_stages.sql
-- ============================================================

GRANT ALL ON crm_stages TO anon, authenticated, service_role;
GRANT ALL ON contact_property_links TO anon, authenticated, service_role;

-- Ensure contacts new columns are accessible (table already had grants,
-- but just in case re-grant the table)
GRANT ALL ON contacts TO anon, authenticated, service_role;
