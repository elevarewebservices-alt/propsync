import { NextResponse } from 'next/server'
import { getSessionAgent, getSessionPlan } from '@/lib/auth'
import { resolvePermissions } from '@/lib/permissions'
import { hasAddon } from '@/lib/addons'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const agent = await getSessionAgent()
  const planId = await getSessionPlan()

  if (!agent) {
    const permissions = resolvePermissions(process.env.NODE_ENV !== 'production' ? 'owner' : 'agente')
    return NextResponse.json({ planId: 'starter', nombre: null, email: null, company: null, permissions, hasMarketingAddon: false })
  }

  const db = createAdminClient()
  const { data: company } = await db
    .from('companies')
    .select('id, nombre')
    .eq('id', (agent as any).company_id)
    .single()

  const permissions = resolvePermissions((agent as any).rol, (agent as any).permissions)
  const hasMarketingAddon = planId === 'pro' && (await hasAddon((agent as any).company_id, 'marketing'))

  return NextResponse.json({
    planId,
    nombre: (agent as any).nombre ?? null,
    email: (agent as any).email ?? null,
    rol: (agent as any).rol ?? null,
    agencia: (company as any)?.nombre ?? null,
    company: company ?? null,
    permissions,
    hasMarketingAddon,
    agent: {
      id: (agent as any).id,
      nombre: (agent as any).nombre,
      email: (agent as any).email,
      rol: (agent as any).rol,
    },
  })
}
