import { NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { getPayPalAccessToken, paypalApiBase } from '@/lib/paypal'

export const dynamic = 'force-dynamic'

/**
 * One-time helper: creates the PayPal product + the two monthly subscription
 * plans ($30 Individual, $60 Pro) via the API and returns their plan ids, so
 * you don't need the no-code plan creator (which isn't available everywhere).
 *
 * Requires being logged in (any authenticated company user). It only creates
 * plans in YOUR OWN PayPal account, so it's not a data-security risk. Visit it
 * once, then copy the returned ids into PAYPAL_PLAN_STARTER / PAYPAL_PLAN_PRO in
 * Vercel. Calling it again creates DUPLICATE plans — only run it once.
 */
export async function GET() {
  try {
    await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'Inicia sesión en propsyncia.com primero' }, { status: 401 })
  }

  const token = await getPayPalAccessToken()
  if (!token) {
    return NextResponse.json(
      { error: 'Faltan credenciales de PayPal. Configura NEXT_PUBLIC_PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET y PAYPAL_ENV en Vercel y redeploy.' },
      { status: 400 },
    )
  }

  const base = paypalApiBase()
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // 1) Product
  const productRes = await fetch(`${base}/v1/catalogs/products`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'PropSync',
      description: 'Plataforma inmobiliaria PropSync',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  })
  const product = await productRes.json()
  if (!productRes.ok) {
    return NextResponse.json({ error: 'Error creando producto', detail: product }, { status: 502 })
  }

  async function createPlan(name: string, price: string) {
    const res = await fetch(`${base}/v1/billing/plans`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        product_id: product.id,
        name,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // infinite
            pricing_scheme: { fixed_price: { value: price, currency_code: 'USD' } },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 2,
        },
      }),
    })
    const data = await res.json()
    return { ok: res.ok, data }
  }

  const pro = await createPlan('PropSync Pro', '60')
  const starter = await createPlan('PropSync Individual', '30')

  if (!pro.ok || !starter.ok) {
    return NextResponse.json({ error: 'Error creando planes', pro: pro.data, starter: starter.data }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    message: 'Copia estos IDs en Vercel y redeploy.',
    PAYPAL_PLAN_PRO: pro.data.id,
    PAYPAL_PLAN_STARTER: starter.data.id,
    product_id: product.id,
  })
}
