import { NextResponse } from 'next/server'
import { resolveCompanyId, isSessionOwner } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { decrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

/**
 * GET — Revela el valor en texto plano de la API key. Solo el propietario.
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
    .select('api_key_enc')
    .eq('id', companyId)
    .single()

  const enc = (data as any)?.api_key_enc
  if (!enc) return NextResponse.json({ error: 'No hay API key generada' }, { status: 404 })

  try {
    return NextResponse.json({ apiKey: decrypt(enc) })
  } catch {
    return NextResponse.json({ error: 'Error al desencriptar' }, { status: 500 })
  }
}
