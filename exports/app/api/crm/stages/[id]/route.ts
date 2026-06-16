import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const body = await request.json()
  const db = createAdminClient()

  const allowed = ['nombre','color','position','is_terminal','requires_approval','required_fields']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const { data, error } = await (db.from('crm_stages') as any)
    .update(patch)
    .eq('id', params.id)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()

  const { data: stage } = await (db.from('crm_stages') as any)
    .select('slug')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .single()

  if (stage) {
    const { count } = await db
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('etapa_crm', (stage as any).slug)
      .eq('is_active', true)

    if (count && count > 0) {
      return Response.json(
        { error: `No se puede eliminar: ${count} contacto(s) están en esta etapa.` },
        { status: 409 }
      )
    }
  }

  const { error } = await (db.from('crm_stages') as any)
    .delete()
    .eq('id', params.id)
    .eq('company_id', companyId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
