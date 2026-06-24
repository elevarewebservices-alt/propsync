import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId, getSessionPermissions } from '@/lib/auth'
import { Pipeline } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const { data, error } = await (db.from('pipelines') as any)
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('position', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(request: Request) {
  const companyId = await resolveCompanyId()
  if (!(await getSessionPermissions()).accessSettings) {
    return Response.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const body = await request.json()
  if (!body.nombre?.trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  const db = createAdminClient()

  const slug = (body.nombre as string)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  const { data: existing } = await (db.from('pipelines') as any)
    .select('position')
    .eq('company_id', companyId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPos = existing?.length > 0 ? ((existing[0] as any).position ?? 0) + 1 : 0

  const { data, error } = await (db.from('pipelines') as any)
    .insert({
      company_id: companyId,
      nombre: body.nombre.trim(),
      slug,
      color: body.color ?? '#3b82f6',
      position: nextPos,
      is_active: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data as Pipeline, { status: 201 })
}
