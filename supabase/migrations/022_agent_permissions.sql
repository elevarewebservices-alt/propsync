-- Per-agent permission overrides. NULL means "use the role's defaults"
-- (see lib/permissions.ts): owner/admin get full access, agente is scoped to
-- their own properties/contacts and can't reach most of Configuración.
-- Owner/admin can grant an individual agent broader access by setting keys
-- here (e.g. {"viewAllContacts": true}) without changing their role.
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;
