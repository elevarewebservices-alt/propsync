import { NextResponse } from 'next/server'
import { resolveCompanyId, isSessionOwner } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { encrypt } from '@/lib/crypto'
import { generateApiKey, hashApiKey } from '@/lib/api-key'
import { canAccess } from '@/lib/plans'
import { PlanId } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET — Estado de la API key (sin exponer el valor). Solo el propietario.
 */
export async function GET() {
  if (!(await isSessionOwner())) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('api_key_hash, api_key_created_at')
    .eq('id', companyId)
    .single()

  return NextResponse.json({
    hasKey: !!(data as any)?.api_key_hash,
    createdAt: (data as any)?.api_key_created_at ?? null,
  })
}

/**
 * POST — Genera (o regenera) la API key, invalidando cualquier key anterior.
 * Solo el propietario.
 */
export async function POST() {
  if (!(await isSessionOwner())) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any)
    .select('plan_id')
    .eq('id', companyId)
    .single()

  if (!canAccess((company as any)?.plan_id as PlanId, 'api')) {
    return NextResponse.json({ error: 'El acceso a la API requiere el plan Pro o superior' }, { status: 403 })
  }

  const plainKey = generateApiKey()

  const { error } = await (db.from('companies') as any)
    .update({
      api_key_hash: hashApiKey(plainKey),
      api_key_enc: encrypt(plainKey),
      api_key_created_at: new Date().toISOString(),
    })
    .eq('id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ apiKey: plainKey })
}

/**
 * DELETE — Revoca la API key (queda sin acceso programático). Solo el propietario.
 */
export async function DELETE() {
  if (!(await isSessionOwner())) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const db = createAdminClient()
  await (db.from('companies') as any)
    .update({ api_key_hash: null, api_key_enc: null, api_key_created_at: null })
    .eq('id', companyId)

  return NextResponse.json({ success: true })
}
