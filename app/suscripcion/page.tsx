import { redirect } from 'next/navigation'
import { resolveCompanyId } from '@/lib/auth'
import { getCompanyAccess } from '@/lib/subscription'
import { createAdminClient } from '@/lib/supabase'
import { getPlan } from '@/lib/plans'
import { paypalPlanIdFor } from '@/lib/paypal'
import type { PlanId } from '@/lib/types'
import { SubscriptionPanel } from '@/components/subscription/SubscriptionPanel'

export const dynamic = 'force-dynamic'

export default async function SuscripcionPage() {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    redirect('/login')
  }

  const access = await getCompanyAccess(companyId)
  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('plan_id, nombre')
    .eq('id', companyId)
    .single()

  const planId = (data?.plan_id ?? 'starter') as PlanId
  const plan = getPlan(planId)

  return (
    <SubscriptionPanel
      companyName={data?.nombre ?? ''}
      status={access.status}
      blocked={access.blocked}
      daysLeft={access.daysLeft}
      planNombre={plan.nombre}
      planPrecio={plan.precio}
      paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? null}
      paypalPlanId={paypalPlanIdFor(planId)}
    />
  )
}
