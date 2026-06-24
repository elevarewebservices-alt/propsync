import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId, canAccessContact } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const db        = createAdminClient()

  if (!(await canAccessContact(companyId, params.id))) {
    return Response.json({ error: 'Contacto no encontrado' }, { status: 404 })
  }

  const { data, error } = await db
    .from('contact_notes')
    .select('id, agent_nombre, contenido, created_at')
    .eq('contact_id', params.id)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const db        = createAdminClient()

  if (!(await canAccessContact(companyId, params.id))) {
    return Response.json({ error: 'Contacto no encontrado' }, { status: 404 })
  }

  const body = await request.json()

  if (!body.contenido?.trim()) {
    return Response.json({ error: 'Contenido requerido' }, { status: 400 })
  }

  const { data, error } = await (db.from('contact_notes') as any)
    .insert({
      contact_id:   params.id,
      company_id:   companyId,
      agent_nombre: body.agent_nombre ?? 'Agente',
      contenido:    body.contenido.trim(),
    })
    .select('id, agent_nombre, contenido, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
