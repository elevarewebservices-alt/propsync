import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase'
import { adminOr403, PLAN_IDS } from '@/lib/admin'
import { seedDefaultCrm } from '@/lib/provision'
import { TRIAL_DAYS } from '@/lib/subscription'
import { cleanText } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/admin/accounts — Elevare creates a client account by hand.
 * Body: { empresa, nombre, email, plan_id, mode }
 *  - mode 'trial'  → standard 15-day trial
 *  - mode 'active' → active now with paid-through = today. The panel then
 *    registers the first payment (POST /api/admin/payments), which extends it.
 *    If no payment is ever registered, the normal grace period locks it.
 *
 * Creates the company + seeds the CRM + pre-creates an inactive owner agent,
 * then sends a Supabase invite. The existing invite-link flow
 * (/auth/callback + lib/auth.ts self-heal) activates the owner on first login.
 */
export async function POST(request: NextRequest) {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin

  const body = await request.json().catch(() => ({}))
  const empresa = cleanText(String(body.empresa ?? ''), 120)
  const nombre = cleanText(String(body.nombre ?? ''), 120)
  const email = String(body.email ?? '').trim().toLowerCase()
  const planId = String(body.plan_id ?? 'starter')
  const mode = body.mode === 'trial' ? 'trial' : 'active'

  if (!empresa || !nombre) return NextResponse.json({ error: 'Empresa y nombre son requeridos' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  if (!(PLAN_IDS as readonly string[]).includes(planId)) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

  const db = createAdminClient()

  // One person = one company. Refuse if this email is already an agent anywhere.
  const { data: existing } = await (db.from('agents') as any)
    .select('id')
    .eq('email', email)
    .limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Ese email ya pertenece a un usuario de PropSync' }, { status: 409 })
  }

  const now = new Date()
  const billing = mode === 'trial'
    ? {
        subscription_status: 'trialing',
        trial_ends_at: new Date(now.getTime() + TRIAL_DAYS * 86_400_000).toISOString(),
      }
    : {
        subscription_status: 'active',
        subscription_provider: 'manual',
        current_period_end: now.toISOString(),
      }

  const { data: company, error: cErr } = await (db.from('companies') as any)
    .insert({ nombre: empresa, email, plan_id: planId, ...billing })
    .select('id')
    .single()
  if (cErr || !company) return NextResponse.json({ error: cErr?.message ?? 'No se pudo crear la empresa' }, { status: 500 })
  const companyId = company.id as string

  const rollback = async () => {
    await (db.from('companies') as any).delete().eq('id', companyId)
  }

  const { error: aErr } = await (db.from('agents') as any).insert({
    company_id: companyId,
    nombre,
    email,
    rol: 'owner',
    is_active: false,
    auth_user_id: null,
  })
  if (aErr) {
    await rollback()
    return NextResponse.json({ error: aErr.message }, { status: 500 })
  }

  await seedDefaultCrm(companyId)

  const authAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { error: iErr } = await authAdmin.auth.admin.inviteUserByEmail(email, {
    data: { nombre, company_id: companyId, rol: 'owner', invited: true },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback`,
  })
  if (iErr) {
    await rollback()
    return NextResponse.json({ error: `No se pudo enviar la invitación: ${iErr.message}` }, { status: 500 })
  }

  console.info('[admin] account created', { by: admin, company: companyId, email, planId, mode })
  return NextResponse.json({ companyId })
}
