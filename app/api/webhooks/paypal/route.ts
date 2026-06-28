import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyPayPalWebhook } from '@/lib/paypal'

export const dynamic = 'force-dynamic'

/**
 * PayPal subscription webhook — the ongoing source of truth. Every event is
 * signature-verified against PayPal before we touch the DB, so a forged
 * "activated" POST can't unlock an account. Maps the PayPal subscription id
 * (resource.id) back to the company via subscription_external_id.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  let event: any
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const headers: Record<string, string | null> = {
    'paypal-auth-algo': request.headers.get('paypal-auth-algo'),
    'paypal-cert-url': request.headers.get('paypal-cert-url'),
    'paypal-transmission-id': request.headers.get('paypal-transmission-id'),
    'paypal-transmission-sig': request.headers.get('paypal-transmission-sig'),
    'paypal-transmission-time': request.headers.get('paypal-transmission-time'),
  }

  const verified = await verifyPayPalWebhook(headers, event)
  if (!verified) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const type = event.event_type as string
  const resource = event.resource ?? {}
  const subscriptionId: string | undefined = resource.id ?? resource.billing_agreement_id
  if (!subscriptionId) return NextResponse.json({ ok: true })

  const db = createAdminClient()
  const update: Record<string, unknown> = {}

  switch (type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
      update.subscription_status = 'active'
      update.subscription_provider = 'paypal'
      if (resource.billing_info?.next_billing_time) update.current_period_end = resource.billing_info.next_billing_time
      break
    case 'PAYMENT.SALE.COMPLETED':
      // A renewal payment cleared — keep them active.
      update.subscription_status = 'active'
      break
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
      update.subscription_status = 'past_due'
      break
    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      update.subscription_status = 'canceled'
      break
    default:
      return NextResponse.json({ ok: true })
  }

  await (db.from('companies') as any)
    .update(update)
    .eq('subscription_external_id', subscriptionId)

  return NextResponse.json({ ok: true })
}
