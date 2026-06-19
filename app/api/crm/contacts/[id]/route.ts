import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'
import { sendStageMilestoneEmail } from '@/lib/email'
import { isValidEmail, isValidPhone, normalizePhone } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const { data: contact, error } = await db
    .from('contacts')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 404 })

  const { data: links } = await db
    .from('contact_property_links')
    .select('*, properties(id, titulo, precio, ciudad, bedrooms, main_image_url)')
    .eq('contact_id', params.id)
    .eq('company_id', companyId)

  return Response.json({ contact, linked_properties: links ?? [] })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const body = await request.json()
  const db = createAdminClient()

  // Fetch current state before update for change detection
  const { data: current } = await db
    .from('contacts')
    .select('etapa_crm, email, nombre, telefono, whatsapp, agente_asignado_id')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .single()

  const allowed = [
    'nombre','email','telefono','whatsapp','notas','tipo','pais','ciudad',
    'zona_interes','tipo_operacion','presupuesto_min','presupuesto_max',
    'etapa_crm','agente_asignado_id','agente_nombre','fecha_seguimiento','fuente',
    'meta_campaign','meta_form','meta_ad_set','tags',
  ]
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  // ── Server-side validation: same rules as on POST ───────────────────────
  if ('email' in patch && patch.email) {
    if (!isValidEmail(String(patch.email))) {
      return Response.json({ error: 'Email no válido' }, { status: 400 })
    }
    patch.email = String(patch.email).trim().toLowerCase()
  }
  if ('telefono' in patch && patch.telefono) {
    if (!isValidPhone(String(patch.telefono))) {
      return Response.json({ error: 'Teléfono no válido' }, { status: 400 })
    }
    patch.telefono = normalizePhone(String(patch.telefono))
  }
  if ('whatsapp' in patch && patch.whatsapp) {
    if (!isValidPhone(String(patch.whatsapp))) {
      return Response.json({ error: 'WhatsApp no válido' }, { status: 400 })
    }
    patch.whatsapp = normalizePhone(String(patch.whatsapp))
  }
  if ('nombre' in patch) {
    if (!patch.nombre || !String(patch.nombre).trim()) {
      return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
    }
    patch.nombre = String(patch.nombre).trim()
  }

  const { data, error } = await (db.from('contacts') as any)
    .update(patch)
    .eq('id', params.id)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const updated = data as Record<string, any>
  const prev    = current as Record<string, any> | null

  // Fire-and-forget post-update triggers
  const stageChanged = 'etapa_crm' in patch && patch.etapa_crm !== prev?.etapa_crm

  if (stageChanged) {
    ;(async () => {
      const { data: stage } = await (db.from('crm_stages') as any)
        .select('nombre, color, is_terminal')
        .eq('company_id', companyId)
        .eq('slug', patch.etapa_crm)
        .single()

      if (stage?.is_terminal) {
        const agentId = updated.agente_asignado_id ?? prev?.agente_asignado_id
        if (agentId) {
          const { data: agent } = await (db.from('agents') as any)
            .select('email, nombre')
            .eq('id', agentId)
            .single()
          if (agent) {
            sendStageMilestoneEmail(
              agent.email,
              agent.nombre,
              updated.nombre ?? prev?.nombre ?? '',
              stage.nombre,
              stage.color,
              stage.is_terminal,
              companyId,
            ).catch(() => {})
          }
        }
      }
    })()
  }

  return Response.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const { error } = await (db.from('contacts') as any)
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('company_id', companyId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
