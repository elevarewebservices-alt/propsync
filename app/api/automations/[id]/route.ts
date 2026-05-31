import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId, getSessionPlan } from '@/lib/auth'
import { canAccess, getPlan } from '@/lib/plans'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const companyId = await resolveCompanyId()
  const body = await request.json()

  // Block activation (is_active: true) if plan doesn't include mantener
  if (body.is_active === true) {
    const planId = await getSessionPlan()
    if (!canAccess(planId, 'mantener')) {
      const plan = getPlan(planId)
      return Response.json(
        { error: `Las automatizaciones requieren plan Pro o superior. Tu plan actual es ${plan.nombre}.`, code: 'PLAN_LIMIT_REACHED' },
        { status: 403 }
      )
    }
  }

  const db = createAdminClient()
  const { data, error } = await (db.from('automations') as any)
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const { error } = await (db.from('automations') as any)
    .delete()
    .eq('id', params.id)
    .eq('company_id', companyId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
