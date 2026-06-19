import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId, getSessionPlan } from '@/lib/auth'
import { canAccess, getPlan } from '@/lib/plans'
import { Automation } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const { data, error } = await (db.from('automations') as any)
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(request: Request) {
  const companyId = await resolveCompanyId()
  const planId = await getSessionPlan()
  if (!canAccess(planId, 'mantener')) {
    const plan = getPlan(planId)
    return Response.json(
      { error: `Las automatizaciones requieren plan Pro o superior. Tu plan actual es ${plan.nombre}.`, code: 'PLAN_LIMIT_REACHED' },
      { status: 403 }
    )
  }
  const body = await request.json()
  if (!body.nombre?.trim()) return Response.json({ error: 'Nombre requerido' }, { status: 400 })
  if (!body.trigger_type) return Response.json({ error: 'Trigger requerido' }, { status: 400 })
  if (!body.actions?.length) return Response.json({ error: 'Al menos una acción es requerida' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await (db.from('automations') as any)
    .insert({
      company_id: companyId,
      nombre: body.nombre.trim(),
      is_active: body.is_active ?? true,
      trigger_type: body.trigger_type,
      trigger_config: body.trigger_config ?? {},
      conditions: body.conditions ?? [],
      actions: body.actions,
    })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data as Automation, { status: 201 })
}
