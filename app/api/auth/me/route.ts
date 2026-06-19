import { NextResponse } from 'next/server'
import { getSessionAgent, getSessionPlan } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const agent = await getSessionAgent()
  const planId = await getSessionPlan()

  if (!agent) {
    return NextResponse.json({ planId: 'starter', nombre: null, email: null, company: null })
  }

  const db = createAdminClient()
  const { data: company } = await db
    .from('companies')
    .select('id, nombre')
    .eq('id', (agent as any).company_id)
    .single()

  return NextResponse.json({
    planId,
    nombre: (agent as any).nombre ?? null,
    email: (agent as any).email ?? null,
    rol: (agent as any).rol ?? null,
    agencia: (company as any)?.nombre ?? null,
    company: company ?? null,
    agent: {
      id: (agent as any).id,
      nombre: (agent as any).nombre,
      email: (agent as any).email,
      rol: (agent as any).rol,
    },
  })
}
