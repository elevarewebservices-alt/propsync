import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { redeemPromoCode } from '@/lib/promo'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let companyId: string
  try {
    // A blocked (trial-expired/unpaid) company must still be able to redeem a
    // promo code to unblock itself — see lib/auth.ts's resolveCompanyId doc.
    companyId = await resolveCompanyId({ skipBillingCheck: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await request.json() as { code?: string }
  const result = await redeemPromoCode(companyId, code ?? '')

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, applied: result.applied })
}
