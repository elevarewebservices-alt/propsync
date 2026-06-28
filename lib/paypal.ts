/**
 * PayPal Subscriptions (recurring) — server-side helpers.
 * Docs: https://developer.paypal.com/docs/subscriptions/
 *
 * Env vars (set in Vercel):
 *  - NEXT_PUBLIC_PAYPAL_CLIENT_ID  (public — also used by the browser SDK)
 *  - PAYPAL_CLIENT_SECRET          (secret — server only)
 *  - PAYPAL_ENV                    'live' | 'sandbox' (default sandbox)
 *  - PAYPAL_PLAN_STARTER / PAYPAL_PLAN_PRO  (billing plan ids per plan)
 *  - PAYPAL_WEBHOOK_ID             (for webhook signature verification)
 */

export function paypalApiBase(): string {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

export function paypalPlanIdFor(planId: string): string | null {
  if (planId === 'pro') return process.env.PAYPAL_PLAN_PRO ?? null
  return process.env.PAYPAL_PLAN_STARTER ?? null
}

export async function getPayPalAccessToken(): Promise<string | null> {
  const id = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) return null

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

export interface PayPalSubscription {
  id: string
  status: string // APPROVAL_PENDING | APPROVED | ACTIVE | SUSPENDED | CANCELLED | EXPIRED
  billing_info?: { next_billing_time?: string }
}

export async function getPayPalSubscription(subscriptionId: string): Promise<PayPalSubscription | null> {
  const token = await getPayPalAccessToken()
  if (!token) return null

  const res = await fetch(`${paypalApiBase()}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

/**
 * Verifies a webhook came from PayPal (signature check via PayPal's API). Never
 * trust a webhook body without this — otherwise anyone could POST a fake
 * "subscription activated" event to unlock an account for free.
 */
export async function verifyPayPalWebhook(
  headers: Record<string, string | null>,
  rawEvent: unknown,
): Promise<boolean> {
  const token = await getPayPalAccessToken()
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!token || !webhookId) return false

  const res = await fetch(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: rawEvent,
    }),
  })
  if (!res.ok) return false
  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}
