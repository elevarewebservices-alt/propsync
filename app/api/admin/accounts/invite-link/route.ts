import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { adminOr403, UUID_RE } from '@/lib/admin'
import { createInviteLink } from '@/lib/invite'
import { sendInviteEmail, type EmailResult } from '@/lib/email'
import { TRIAL_DAYS } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/accounts/invite-link { companyId, send?: boolean }
 * Elevare-only: a fresh access link for the company's owner — for when the
 * first invite expired (24 h) or never arrived. Returns the link so it can be
 * shared by WhatsApp; with send=true it's also emailed.
 */
export async function POST(request: NextRequest) {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin

  const body = await request.json().catch(() => ({}))
  const companyId = String(body.companyId ?? '')
  if (!UUID_RE.test(companyId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const db = createAdminClient()
  const [{ data: company }, { data: owner }] = await Promise.all([
    (db.from('companies') as any).select('nombre, subscription_status').eq('id', companyId).single(),
    (db.from('agents') as any).select('nombre, email, auth_user_id').eq('company_id', companyId).eq('rol', 'owner').order('created_at').limit(1).maybeSingle(),
  ])
  if (!company || !owner?.email) return NextResponse.json({ error: 'La empresa no tiene un titular con email' }, { status: 404 })

  let link: string
  try {
    ;({ link } = await createInviteLink(owner.email, { nombre: owner.nombre, company_id: companyId, rol: 'owner', invited: true }, request.nextUrl.origin))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo generar el enlace' }, { status: 500 })
  }

  let mail: EmailResult | null = null
  if (body.send === true) {
    mail = await sendInviteEmail({
      email: owner.email, nombre: owner.nombre, empresa: company.nombre, link, isOwner: true,
      trialDays: company.subscription_status === 'trialing' ? TRIAL_DAYS : null, companyId,
    }).catch((e): EmailResult => ({ ok: false, error: e instanceof Error ? e.message : String(e) }))
    if (!mail.ok) console.error('[admin] invite email failed', mail.error)
  }

  console.info('[admin] invite link generated', { by: admin, company: companyId, sent: body.send === true })
  return NextResponse.json({
    link, email: owner.email, activated: Boolean(owner.auth_user_id),
    emailSent: mail ? mail.ok : null, emailError: mail && !mail.ok ? mail.error : null,
  })
}
