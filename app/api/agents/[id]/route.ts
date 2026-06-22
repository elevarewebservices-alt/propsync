import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId, getSessionAgent } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const me = await getSessionAgent()
  const meRol = (me as any)?.rol ?? (process.env.NODE_ENV !== 'production' ? 'owner' : null)

  if (!meRol || !['owner', 'admin'].includes(meRol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const db = createAdminClient()

  const allowed = ['nombre', 'telefono', 'rol', 'is_active']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  if ('rol' in patch) {
    // Prevent privilege escalation: nobody can change their own role, only
    // an existing owner can grant the owner role, and the current owner
    // can't be demoted through this endpoint.
    if ((me as any)?.id === params.id) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol.' }, { status: 400 })
    }
    if (patch.rol === 'owner' && meRol !== 'owner') {
      return NextResponse.json({ error: 'Solo el propietario puede asignar el rol de propietario.' }, { status: 403 })
    }

    const { data: target } = await db
      .from('agents')
      .select('rol')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if ((target as any)?.rol === 'owner' && patch.rol !== 'owner') {
      return NextResponse.json({ error: 'No se puede cambiar el rol del propietario.' }, { status: 400 })
    }
  }

  const { data, error } = await (db.from('agents') as any)
    .update(patch)
    .eq('id', params.id)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const me = await getSessionAgent()
  const meRol = (me as any)?.rol ?? (process.env.NODE_ENV !== 'production' ? 'owner' : null)

  if (!meRol || !['owner', 'admin'].includes(meRol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Prevent self-deletion and owner deletion
  if ((me as any)?.id === params.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo.' }, { status: 400 })
  }

  const db = createAdminClient()

  // Check target agent isn't owner
  const { data: target } = await db
    .from('agents')
    .select('rol')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .single()

  if ((target as any)?.rol === 'owner') {
    return NextResponse.json({ error: 'No se puede eliminar al propietario.' }, { status: 400 })
  }

  const { error } = await (db.from('agents') as any)
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
