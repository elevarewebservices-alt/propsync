import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const companyId = await resolveCompanyId()
  const body = await request.json()
  const db = createAdminClient()
  const { data, error } = await (db.from('pipelines') as any)
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()

  // Check if any stages still reference this pipeline
  const { count } = await (db.from('crm_stages') as any)
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('pipeline_id', params.id)

  if (count && count > 0) {
    return Response.json(
      { error: `Este pipeline tiene ${count} etapa${count === 1 ? '' : 's'} asignada${count === 1 ? '' : 's'}. Reasígnalas antes de eliminar.` },
      { status: 409 }
    )
  }

  const { error } = await (db.from('pipelines') as any)
    .delete()
    .eq('id', params.id)
    .eq('company_id', companyId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
