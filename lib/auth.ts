import { cookies } from 'next/headers'
import { createServerSupabaseClient, createAdminClient } from './supabase'
import { resolvePermissions, type AgentPermissions } from './permissions'

// Returns the company_id for the currently authenticated user.
// Falls back to NEXT_PUBLIC_DEV_COMPANY_ID when no session exists (dev mode).
export async function resolveCompanyId(): Promise<string> {
  const id = await getSessionCompanyId()
  if (id) return id
  // The dev fallback is ONLY allowed outside production. In production a request
  // without a valid session must fail closed — never default to a company,
  // otherwise an unauthenticated call could touch another tenant's data.
  if (process.env.NODE_ENV !== 'production') {
    const devId = process.env.NEXT_PUBLIC_DEV_COMPANY_ID
    if (devId) return devId
  }
  throw new Error('No company context — user not authenticated')
}

// Self-heals invited agents whose auth_user_id never got linked — e.g. if
// /auth/callback's link step was interrupted (network blip, double-click on
// the invite link, etc). The invite metadata (company_id + invited flag) is
// baked into the JWT at invite time, so it's safe to retry this match on any
// request rather than only once in the callback.
async function linkInvitedAgentIfNeeded(user: { id: string; email?: string; user_metadata?: any }) {
  const meta = user.user_metadata as { invited?: boolean; company_id?: string } | undefined
  if (!meta?.invited || !meta?.company_id || !user.email) return

  const db = createAdminClient()
  await (db.from('agents') as any)
    .update({ auth_user_id: user.id, is_active: true })
    .eq('company_id', meta.company_id)
    .eq('email', user.email)
    .is('auth_user_id', null)
}

// Returns company_id from the session, or null if no session.
export async function getSessionCompanyId(): Promise<string | null> {
  try {
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient({
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return null

    const db = createAdminClient()
    const { data: agent } = await db
      .from('agents')
      .select('company_id')
      .eq('auth_user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (agent) return (agent as any).company_id

    await linkInvitedAgentIfNeeded(session.user)
    const { data: retried } = await db
      .from('agents')
      .select('company_id')
      .eq('auth_user_id', session.user.id)
      .eq('is_active', true)
      .single()

    return (retried as any)?.company_id ?? null
  } catch {
    return null
  }
}

// Returns the full session user object, or null.
export async function getSessionUser() {
  try {
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient({
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    })
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user ?? null
  } catch {
    return null
  }
}

// Returns the company's plan_id for the current session, or 'starter' as the safe default.
export async function getSessionPlan(): Promise<'starter' | 'pro'> {
  try {
    const companyId = await getSessionCompanyId()
    if (!companyId) return 'starter'

    const db = createAdminClient()
    const { data } = await db
      .from('companies')
      .select('plan_id')
      .eq('id', companyId)
      .single()

    const plan = (data as any)?.plan_id
    if (plan === 'pro') return plan
    return 'starter'
  } catch {
    return 'starter'
  }
}

// True when the current session user is the account owner (the user that
// created the company). Used to gate owner-only actions like CSV export.
// In dev (no session) it returns true, mirroring resolveCompanyId's dev fallback.
export async function isSessionOwner(): Promise<boolean> {
  const agent = await getSessionAgent()
  if (agent) return (agent as any).rol === 'owner'
  return process.env.NODE_ENV !== 'production'
}

// Returns the agent row for the current session user, or null.
export async function getSessionAgent() {
  try {
    const user = await getSessionUser()
    if (!user) return null

    const db = createAdminClient()
    const { data } = await db
      .from('agents')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (data) return data as any

    await linkInvitedAgentIfNeeded(user)
    const { data: retried } = await db
      .from('agents')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    return retried as any ?? null
  } catch {
    return null
  }
}

// Returns the effective permissions for the current session user — role
// defaults merged with any per-agent override (agents.permissions). In dev
// (no session) it grants full access, mirroring isSessionOwner's fallback.
export async function getSessionPermissions(): Promise<AgentPermissions> {
  const agent = await getSessionAgent()
  if (!agent) {
    return resolvePermissions(process.env.NODE_ENV !== 'production' ? 'owner' : 'agente')
  }
  return resolvePermissions((agent as any).rol, (agent as any).permissions)
}

// True if the current session can view/edit the given contact — always true
// with viewAllContacts, otherwise only if it's assigned to them. Used to
// return a 404 (not 403) so a restricted agente can't probe which contact
// ids exist outside their own.
export async function canAccessContact(companyId: string, contactId: string): Promise<boolean> {
  const permissions = await getSessionPermissions()
  if (permissions.viewAllContacts) return true

  const me = await getSessionAgent()
  const db = createAdminClient()
  const { data } = await db
    .from('contacts')
    .select('agente_asignado_id')
    .eq('id', contactId)
    .eq('company_id', companyId)
    .single()

  return !!data && (data as any).agente_asignado_id === (me as any)?.id
}

// True if the current session can edit/delete the given property — always
// true with editAllProperties, otherwise only if it's assigned to them.
// Properties stay visible to everyone (only editing is scoped), so this is
// not used to gate reads.
export async function canEditProperty(companyId: string, propertyId: string): Promise<boolean> {
  const permissions = await getSessionPermissions()
  if (permissions.editAllProperties) return true

  const me = await getSessionAgent()
  const db = createAdminClient()
  const { data } = await db
    .from('properties')
    .select('agente_asignado_id')
    .eq('id', propertyId)
    .eq('company_id', companyId)
    .single()

  return !!data && (data as any).agente_asignado_id === (me as any)?.id
}
