import { cookies } from 'next/headers'
import { createServerSupabaseClient, createAdminClient } from './supabase'

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

    return (agent as any)?.company_id ?? null
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
export async function getSessionPlan(): Promise<'starter' | 'pro' | 'agency'> {
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
    if (plan === 'pro' || plan === 'agency') return plan
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

    return data as any ?? null
  } catch {
    return null
  }
}
