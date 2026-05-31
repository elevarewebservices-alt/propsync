import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; linkId: string } }
) {
  const companyId = await resolveCompanyId()
  const body      = await request.json()
  const db        = createAdminClient()

  const allowed = ['interes']
  const patch: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]

  const { data, error } = await (db.from('contact_property_links') as any)
    .update(patch)
    .eq('id', params.linkId)
    .eq('contact_id', params.id)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; linkId: string } }
) {
  const companyId = await resolveCompanyId()
  const db        = createAdminClient()

  const { error } = await db
    .from('contact_property_links')
    .delete()
    .eq('id', params.linkId)
    .eq('contact_id', params.id)
    .eq('company_id', companyId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
