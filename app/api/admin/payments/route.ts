import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { adminOr403, addMonths, PAYMENT_METHODS, UUID_RE } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/** GET /api/admin/payments[?companyId=] — payment log, newest first. */
export async function GET(request: NextRequest) {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin

  const companyId = request.nextUrl.searchParams.get('companyId')
  const db = createAdminClient()
  let q = (db.from('manual_payments') as any)
    .select('*, companies(nombre)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (companyId && UUID_RE.test(companyId)) q = q.eq('company_id', companyId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payments: data ?? [] })
}

/**
 * POST /api/admin/payments — register a manual (ACH/cash) payment and extend
 * the company's paid-through date by `months`. The new period starts at the
 * current paid-through date if it's still in the future (paying early doesn't
 * lose days), otherwise today.
 * Body: { companyId, amount, months, method?, reference?, notes? }
 */
export async function POST(request: NextRequest) {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin

  const body = await request.json().catch(() => ({}))
  const companyId = String(body.companyId ?? '')
  const amount = Number(body.amount)
  const months = Number(body.months ?? 1)
  const method = String(body.method ?? 'ach')

  if (!UUID_RE.test(companyId)) return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
  if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    return NextResponse.json({ error: 'Meses debe ser entre 1 y 24' }, { status: 400 })
  }
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) {
    return NextResponse.json({ error: 'Método inválido' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: company, error: cErr } = await (db.from('companies') as any)
    .select('id, current_period_end')
    .eq('id', companyId)
    .single()
  if (cErr || !company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

  const now = new Date()
  const currentEnd = company.current_period_end ? new Date(company.current_period_end) : null
  const periodStart = currentEnd && currentEnd > now ? currentEnd : now
  const periodEnd = addMonths(periodStart, months)

  const { data: payment, error: pErr } = await (db.from('manual_payments') as any)
    .insert({
      company_id: companyId,
      amount,
      method,
      reference: body.reference ? String(body.reference).slice(0, 200) : null,
      notes: body.notes ? String(body.notes).slice(0, 1000) : null,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      created_by_email: admin,
    })
    .select()
    .single()
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const { error: uErr } = await (db.from('companies') as any)
    .update({
      subscription_status: 'active',
      subscription_provider: 'manual',
      current_period_end: periodEnd.toISOString(),
    })
    .eq('id', companyId)
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  console.info('[admin] payment registered', { by: admin, company: companyId, amount, months })
  return NextResponse.json({ payment, current_period_end: periodEnd.toISOString() })
}
