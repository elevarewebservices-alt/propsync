// Per-agent permission model. Pure functions, no server-only imports, so this
// is safe to use from both client and server code.
//
// Defaults are role-based: owner/admin get full access, agente is scoped to
// only what they created/are assigned. Owner/admin can override individual
// keys per agent (stored in agents.permissions, JSONB) without changing role.

export interface AgentPermissions {
  // Can edit/delete any property in the company. When false, an agente can
  // still see and create properties, but can only edit/delete ones where
  // agente_asignado_id is their own agent id.
  editAllProperties: boolean
  // Can see any contact in the company. When false, an agente only sees
  // contacts where agente_asignado_id is their own agent id (create/edit
  // follow the same scope, since you can't edit what you can't see).
  viewAllContacts: boolean
  // Can reach Configuración pages/APIs beyond "General" (Usuarios, Pipelines
  // & CRM, Descripción IA, Fuentes, Planes).
  accessSettings: boolean
}

export type AgentPermissionOverrides = Partial<AgentPermissions>

const ROLE_DEFAULTS: Record<string, AgentPermissions> = {
  owner: { editAllProperties: true, viewAllContacts: true, accessSettings: true },
  admin: { editAllProperties: true, viewAllContacts: true, accessSettings: true },
  agente: { editAllProperties: false, viewAllContacts: false, accessSettings: false },
}

export function resolvePermissions(
  rol: string | null | undefined,
  overrides?: AgentPermissionOverrides | null
): AgentPermissions {
  const base = ROLE_DEFAULTS[rol ?? 'agente'] ?? ROLE_DEFAULTS.agente
  return { ...base, ...(overrides ?? {}) }
}
