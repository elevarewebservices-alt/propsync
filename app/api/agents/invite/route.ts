import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId, getSessionAgent, getSessionPlan } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { getPlan } from '@/lib/plans'
import { createInviteLink } from '@/lib/invite'
import { sendInviteEmail, type EmailResult } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const companyId = await resolveCompanyId()
  const me = await getSessionAgent()

  // Only owner/admin can invite
  if (!['owner', 'admin'].includes((me as any)?.rol ?? '')) {
    return NextResponse.json({ error: 'Sin permisos para invitar agentes.' }, { status: 403 })
  }

  const { nombre, email, rol = 'agente' } = await request.json()

  if (!nombre?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nombre y email son requeridos.' }, { status: 400 })
  }

  if (!['agente', 'admin'].includes(rol)) {
    return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
  }

  const db = createAdminClient()

  // Enforce agent limit by plan
  const planId = await getSessionPlan()
  const plan = getPlan(planId)
  const agentLimit = plan.limites.agentes
  if (agentLimit !== 'ilimitado') {
    const { count } = await db
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true)
    if (count !== null && count >= (agentLimit as number)) {
      return NextResponse.json(
        {
          error: `Límite alcanzado: tu plan ${plan.nombre} permite ${agentLimit} agente${agentLimit === 1 ? '' : 's'}. Actualiza tu plan para invitar más.`,
          code: 'PLAN_LIMIT_REACHED',
        },
        { status: 403 }
      )
    }
  }

  // Check if agent already exists in this company
  const { data: existing } = await db
    .from('agents')
    .select('id, is_active')
    .eq('company_id', companyId)
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Ya existe un agente con ese correo en tu empresa.' },
      { status: 409 }
    )
  }

  // Pre-create agent row (inactive — activated when invite is accepted)
  const { error: insertError } = await (db.from('agents') as any).insert({
    company_id: companyId,
    nombre,
    email,
    rol,
    is_active: false,
    auth_user_id: null,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Invite link + email through our own transport (lib/invite.ts — Supabase's
  // built-in mailer doesn't reliably reach external addresses).
  let inviteLink: string
  try {
    ;({ link: inviteLink } = await createInviteLink(email, { nombre, company_id: companyId, rol, invited: true }, request.nextUrl.origin))
  } catch (err) {
    await db.from('agents').delete().eq('company_id', companyId).eq('email', email)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo crear la invitación' }, { status: 500 })
  }
  const { data: companyRow } = await (db.from('companies') as any).select('nombre').eq('id', companyId).single()
  const mail = await sendInviteEmail({ email, nombre, empresa: companyRow?.nombre ?? 'PropSync', link: inviteLink, isOwner: false, companyId })
    .catch((e): EmailResult => ({ ok: false, error: e instanceof Error ? e.message : String(e) }))
  if (!mail.ok) console.error('[agents/invite] email failed', mail.error)

  return NextResponse.json({ success: true, inviteLink, emailSent: mail.ok, emailError: mail.ok ? null : mail.error })
}
