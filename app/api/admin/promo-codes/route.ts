import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { adminOr403, isIsoDate, UUID_RE } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/** GET /api/admin/promo-codes — all codes, newest first. */
export async function GET() {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin

  const db = createAdminClient()
  const { data, error } = await (db.from('promo_codes') as any)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ codes: data ?? [] })
}

function intIn(v: unknown, min: number, max: number): number | null {
  const n = Number(v ?? 0)
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

/**
 * POST /api/admin/promo-codes — create a code.
 * Body: { code, descripcion?, trial_extra_days?, free_months?, discount_percent?, max_uses?, expires_at? }
 */
export async function POST(request: NextRequest) {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin

  const body = await request.json().catch(() => ({}))
  const code = String(body.code ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    return NextResponse.json({ error: 'Código: 3-40 caracteres, letras, números, - o _' }, { status: 400 })
  }
  const trial_extra_days = intIn(body.trial_extra_days, 0, 365)
  const free_months = intIn(body.free_months, 0, 24)
  const discount_percent = intIn(body.discount_percent, 0, 100)
  if (trial_extra_days === null || free_months === null || discount_percent === null) {
    return NextResponse.json({ error: 'Valores numéricos fuera de rango' }, { status: 400 })
  }
  const max_uses = body.max_uses === null || body.max_uses === '' || body.max_uses === undefined
    ? null : intIn(body.max_uses, 1, 100000)
  if (body.max_uses && max_uses === null) return NextResponse.json({ error: 'Máximo de usos inválido' }, { status: 400 })
  if (body.expires_at && !isIsoDate(body.expires_at)) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await (db.from('promo_codes') as any)
    .insert({
      code,
      descripcion: body.descripcion ? String(body.descripcion).slice(0, 200) : null,
      trial_extra_days,
      free_months,
      discount_percent,
      max_uses,
      expires_at: body.expires_at || null,
    })
    .select()
    .single()
  if (error) {
    const dup = /duplicate|unique/i.test(error.message)
    return NextResponse.json({ error: dup ? 'Ese código ya existe' : error.message }, { status: dup ? 409 : 500 })
  }
  return NextResponse.json({ code: data })
}

/** PATCH /api/admin/promo-codes — { id, activo } enable/disable a code. */
export async function PATCH(request: NextRequest) {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin

  const body = await request.json().catch(() => ({}))
  if (!UUID_RE.test(String(body.id ?? ''))) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await (db.from('promo_codes') as any)
    .update({ activo: Boolean(body.activo) })
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
