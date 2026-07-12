import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { getPayPalSubscription } from '@/lib/paypal'

export const dynamic = 'force-dynamic'

/**
 * Called by the PayPal button's onApprove with the subscription id. We DON'T
 * trust the client — we fetch the subscription straight from PayPal and only
 * mark the company active if PayPal itself reports it ACTIVE/APPROVED. The
 * webhook is the ongoing source of truth for renewals/cancellations.
 */
export async function POST(request: NextRequest) {
  let companyId: string
  try {
    // A blocked (trial-expired/unpaid) company is exactly who needs to reach
    // this route to pay and unblock itself — see lib/auth.ts's
    // resolveCompanyId doc.
    companyId = await resolveCompanyId({ skipBillingCheck: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { subscriptionID } = await request.json() as { subscriptionID?: string }
  if (!subscriptionID) {
    return NextResponse.json({ error: 'Falta subscriptionID' }, { status: 400 })
  }

  const sub = await getPayPalSubscription(subscriptionID)
  if (!sub) {
    return NextResponse.json({ error: 'No se pudo verificar con PayPal' }, { status: 502 })
  }

  if (sub.status !== 'ACTIVE' && sub.status !== 'APPROVED') {
    return NextResponse.json({ error: `Suscripción no activa (${sub.status})` }, { status: 400 })
  }

  const db = createAdminClient()

  // A subscription id must map to exactly one company (also enforced by a
  // unique index in migration 025) — reject if another company already
  // claimed it, so two tenants can never share billing state.
  const { data: existing } = await (db.from('companies') as any)
    .select('id')
    .eq('subscription_external_id', subscriptionID)
    .neq('id', companyId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Esta suscripción ya está asociada a otra cuenta.' }, { status: 409 })
  }

  await (db.from('companies') as any)
    .update({
      subscription_status: 'active',
      subscription_provider: 'paypal',
      subscription_external_id: subscriptionID,
      current_period_end: sub.billing_info?.next_billing_time ?? null,
    })
    .eq('id', companyId)

  return NextResponse.json({ ok: true })
}
