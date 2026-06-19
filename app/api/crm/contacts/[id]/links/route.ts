import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const body      = await request.json()
  const db        = createAdminClient()

  if (!body.property_id) {
    return Response.json({ error: 'property_id requerido' }, { status: 400 })
  }

  // Confirm the contact + property both belong to this company before linking
  const [{ data: contact }, { data: property }] = await Promise.all([
    db.from('contacts').select('id').eq('id', params.id).eq('company_id', companyId).single(),
    db.from('properties').select('id').eq('id', body.property_id).eq('company_id', companyId).single(),
  ])
  if (!contact)  return Response.json({ error: 'Contacto no encontrado' }, { status: 404 })
  if (!property) return Response.json({ error: 'Propiedad no encontrada' }, { status: 404 })

  const { data, error } = await (db.from('contact_property_links') as any)
    .insert({
      contact_id:  params.id,
      property_id: body.property_id,
      company_id:  companyId,
      interes:     body.interes ?? 'interesado',
    })
    .select()
    .single()

  if (error) {
    // unique constraint = already linked
    if (error.code === '23505') return Response.json({ error: 'Ya vinculado' }, { status: 409 })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data, { status: 201 })
}
