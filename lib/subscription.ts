import { createAdminClient } from './supabase'

export const TRIAL_DAYS = 15

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | null

export interface CompanyAccess {
  blocked: boolean
  status: SubscriptionStatus
  trialEndsAt: string | null
  daysLeft: number | null
  reason: 'trial_active' | 'paid' | 'grandfathered' | 'trial_expired' | 'unpaid'
}

/**
 * Server-side source of truth for whether a company may use the app. Reads the
 * subscription columns straight from the DB via the admin client (which clients
 * cannot write to — see migration 024), so this verdict can't be forged.
 *
 * - null status  → grandfathered company (existed before billing) → allowed.
 * - 'active'     → paid → allowed.
 * - 'trialing'   → allowed only while trial_ends_at is in the future.
 * - past_due/canceled → blocked until they pay.
 */
export async function getCompanyAccess(companyId: string): Promise<CompanyAccess> {
  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('subscription_status, trial_ends_at')
    .eq('id', companyId)
    .single()

  const status = (data?.subscription_status ?? null) as SubscriptionStatus
  const trialEndsAt = (data?.trial_ends_at ?? null) as string | null

  const daysLeft = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Grandfathered: no billing info → allowed.
  if (status === null) {
    return { blocked: false, status, trialEndsAt, daysLeft, reason: 'grandfathered' }
  }

  if (status === 'active') {
    return { blocked: false, status, trialEndsAt, daysLeft, reason: 'paid' }
  }

  if (status === 'trialing') {
    const expired = !trialEndsAt || new Date(trialEndsAt).getTime() <= Date.now()
    return {
      blocked: expired,
      status,
      trialEndsAt,
      daysLeft,
      reason: expired ? 'trial_expired' : 'trial_active',
    }
  }

  // past_due / canceled → blocked.
  return { blocked: true, status, trialEndsAt, daysLeft, reason: 'unpaid' }
}
