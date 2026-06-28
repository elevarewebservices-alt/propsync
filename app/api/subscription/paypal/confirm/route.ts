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
    companyId = await resolveCompanyId()
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
