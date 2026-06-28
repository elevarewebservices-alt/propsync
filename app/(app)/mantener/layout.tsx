import { resolveCompanyId, getSessionPlan } from '@/lib/auth'
import { hasAddon } from '@/lib/addons'
import { MantenerUpsell } from '@/components/mantener/MantenerUpsell'

export const dynamic = 'force-dynamic'

// Gates the entire Mantener module behind the Marketing add-on. Enforced
// server-side: every /mantener/* page renders the upsell instead of its content
// unless the company is on Pro AND has an active marketing add-on row. Fails
// closed — any error resolving the session shows the upsell.
export default async function MantenerLayout({ children }: { children: React.ReactNode }) {
  let allowed = false
  try {
    const companyId = await resolveCompanyId()
    const plan = await getSessionPlan()
    allowed = plan === 'pro' && (await hasAddon(companyId, 'marketing'))
  } catch {
    allowed = false
  }

  if (!allowed) return <MantenerUpsell />

  return <>{children}</>
}
