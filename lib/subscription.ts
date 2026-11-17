import { cache } from 'react'
import { createAdminClient } from './supabase'

export const TRIAL_DAYS = 15
export const PAYMENT_GRACE_DAYS = 3

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
 *
 * Cached per request (keyed on companyId): resolveCompanyId() runs this gate on
 * every call, and the app shell layout used to ask for it again on top of that.
 * Deduping is safe — a subscription can't change mid-render.
 */
export const getCompanyAccess = cache(async function getCompanyAccess(companyId: string): Promise<CompanyAccess> {
  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('subscription_status, trial_ends_at, current_period_end, subscription_provider')
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
    // Manually-billed (ACH) accounts and promo free months carry a paid-through
    // date. Once it passes (plus a short grace for late transfers) the account
    // locks until a new payment is registered in the admin panel. PayPal is
    // excluded: its webhooks flip the status itself, and renewals don't always
    // refresh current_period_end. No date = open-ended.
    const periodEnd = (data?.current_period_end ?? null) as string | null
    const lapsed = data?.subscription_provider !== 'paypal' && periodEnd !== null &&
      new Date(periodEnd).getTime() + PAYMENT_GRACE_DAYS * 86_400_000 <= Date.now()
    return { blocked: lapsed, status, trialEndsAt, daysLeft, reason: lapsed ? 'unpaid' : 'paid' }
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
})
