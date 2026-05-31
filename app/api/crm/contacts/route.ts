import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'
import { Contact } from '@/lib/types'
import { sendNewLeadNotification } from '@/lib/email'
import { isValidEmail, isValidPhone, normalizePhone } from '@/lib/validation'

export async function GET(request: Request) {
  const companyId = await resolveCompanyId()
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')
  const tipo = searchParams.get('tipo')
  const search = searchParams.get('search')
  const tag = searchParams.get('tag')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '200')
  const offset = (page - 1) * limit

  const db = createAdminClient()
  let query = db
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (stage) query = query.eq('etapa_crm', stage)
  if (tipo) query = query.eq('tipo', tipo)
  if (tag) query = query.contains('tags', [tag])
  if (search) {
    query = query.or(
      `nombre.ilike.%${search}%,email.ilike.%${search}%,telefono.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ contacts: data ?? [], total: count ?? 0 })
}

export async function POST(request: Request) {
  const companyId = await resolveCompanyId()
  const body = await request.json()
  const db = createAdminClient()

  // ── Server-side validation — last line of defence ──────────────────────
  if (!body.nombre || typeof body.nombre !== 'string' || !body.nombre.trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  if (body.email && !isValidEmail(body.email)) {
    return Response.json({ error: 'Email no válido' }, { status: 400 })
  }
  if (body.telefono && !isValidPhone(body.telefono)) {
    return Response.json({ error: 'Teléfono no válido' }, { status: 400 })
  }
  if (body.whatsapp && !isValidPhone(body.whatsapp)) {
    return Response.json({ error: 'WhatsApp no válido' }, { status: 400 })
  }

  const payload = {
    company_id: companyId,
    nombre: body.nombre.trim(),
    email:    body.email    ? body.email.trim().toLowerCase()         : null,
    telefono: body.telefono ? normalizePhone(body.telefono)           : null,
    whatsapp: body.whatsapp ? normalizePhone(body.whatsapp)           : null,
    notas: body.notas ?? null,
    tipo: body.tipo ?? 'cliente',
    pais: body.pais ?? 'Panamá',
    ciudad: body.ciudad ?? null,
    zona_interes: body.zona_interes ?? null,
    tipo_operacion: body.tipo_operacion ?? 'compra',
    presupuesto_min: body.presupuesto_min ?? null,
    presupuesto_max: body.presupuesto_max ?? null,
    etapa_crm: body.etapa_crm ?? 'nuevo_lead',
    agente_nombre: body.agente_nombre ?? null,
    fecha_seguimiento: body.fecha_seguimiento ?? null,
    fuente: body.fuente ?? 'manual',
    meta_campaign: body.meta_campaign ?? null,
    meta_form: body.meta_form ?? null,
    meta_ad_set: body.meta_ad_set ?? null,
    tags: body.tags ?? [],
  }

  const { data, error } = await (db.from('contacts') as any)
    .insert(payload)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const created = data as Contact

  // Fire-and-forget — don't block the response
  if (created.agente_asignado_id) {
    ;(async () => {
      const { data: agent } = await (db.from('agents') as any)
        .select('email, nombre')
        .eq('id', created.agente_asignado_id)
        .single()
      if (agent) {
        sendNewLeadNotification(agent.email, agent.nombre, {
          nombre:       created.nombre,
          fuente:       created.fuente,
          tipo:         created.tipo,
          telefono:     created.telefono,
          email:        created.email,
          ciudad:       created.ciudad,
          zona_interes: created.zona_interes,
        }, companyId).catch(() => {})
      }
    })()
  }

  return Response.json(created, { status: 201 })
}
