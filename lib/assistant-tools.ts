import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from './supabase'
import { matchPropertiesForContact, type PropertyForMatch } from './matching'
import type { Contact } from './types'

// ── System prompt (dynamic per tenant) ───────────────────────────────────────

export function buildSystemPrompt(agencyName: string): string {
  return `Eres PropSync AI, el asistente inteligente de ${agencyName}.

Tienes acceso en tiempo real a:
- El inventario completo de propiedades (búsqueda, filtros, notas, y CREAR nuevas)
- El CRM de leads y contactos (crear, buscar, notas, seguimientos, etapas)
- Vincular clientes con propiedades y sugerir propiedades que encajan con un cliente
- El equipo de agentes y sus asignaciones

FLUJO CLIENTE↔PROPIEDAD:
- Cuando trabajes con nombres (ej: "vincula a Juan con la propiedad de Marbella"), primero busca el UUID con search_contacts y search_properties, luego usa link_contact_property.
- Para recomendar inmuebles a un cliente ("¿qué tengo para María?"), usa match_properties_for_contact con su UUID y presenta las mejores opciones con sus razones.
- Para registrar interacciones usa add_contact_note; para recordatorios usa schedule_followup.

REGLAS IMPORTANTES:
1. NUNCA elimines datos. Para propiedades: usa inactivar / marcar vendida / marcar alquilada.
2. Para acciones que modifican datos (cambiar estado, crear contacto, agregar nota), confirma brevemente qué harás y ejecútalo de inmediato.
3. Responde en español, de forma concisa y profesional.
4. Usa markdown cuando ayude: **negrita** para datos clave, listas para múltiples items.
5. Si no encuentras algo, dilo claramente — no inventes datos.

CREAR PROPIEDADES:
- Puedes crear propiedades nuevas con la herramienta create_property cuando el usuario te dé la información.
- Antes de crear, RECOPILA la información que falte. Pregunta por los datos que no te hayan dado, idealmente agrupados en un solo mensaje (ej: "Para crear la propiedad me faltan: ¿es venta o arriendo? ¿en qué ciudad y zona? ¿cuántas habitaciones y baños? ¿quién es el propietario?").
- Datos que debes intentar reunir: **título**, **precio**, **tipo** (venta/arriendo), **tipo de inmueble**, **ciudad**, **zona**, **dirección**, **habitaciones**, **baños**, **garajes**, **área (m²)** y **propietario** (nombre + teléfono).
- Título y precio son OBLIGATORIOS: si no los tienes, no crees la propiedad, pídelos.
- Para el resto: pídelos una vez. Si el usuario no los sabe, dice "no" o pide crearla rápido/ya, créala con lo que tengas — no insistas más de una vez ni bloquees la creación por datos opcionales.
- Antes de crear, muestra un breve resumen de lo que vas a registrar y créala (no esperes una confirmación extra si el usuario ya te dio todo).
- NO inventes datos de la propiedad. Usa solo lo que el usuario te dé.
- PROPIETARIO: si el usuario menciona quién es el dueño, pasa propietario_nombre/propietario_telefono/propietario_email a create_property. El sistema reutiliza el contacto si el teléfono ya existe (no duplica) o crea uno nuevo tipo "propietario" y lo vincula. Si no menciona dueño, no lo pidas obligatoriamente.
- FOTOS: no puedes recibir ni subir fotos por el chat. Después de crear la propiedad, dile al usuario que se creó como **inactiva** y dale el enlace de edición (el campo edit_url que devuelve la herramienta, ej: "/propiedades/ID/editar") para que **suba las fotos y la active** desde ahí. Preséntalo como un enlace markdown clickeable.

ÁMBITO EXCLUSIVO: Este asistente es para gestión inmobiliaria de ${agencyName} únicamente.
Si el usuario pregunta sobre temas ajenos (cocina, clima, programación general, entretenimiento, etc.),
responde EXACTAMENTE así, sin usar ninguna herramienta:
"Entiendo tu pregunta, pero este asistente está diseñado para ayudarte con la gestión de tu agencia inmobiliaria. Puedo ayudarte a buscar propiedades, gestionar leads, revisar seguimientos y más. ¿En qué puedo ayudarte hoy?"`
}

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const db = createAdminClient()

  switch (name) {

    // ── Dashboard stats ────────────────────────────────────────────────────
    case 'get_dashboard_stats': {
      const now   = new Date()
      const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const week  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const today = now.toISOString().slice(0, 10)

      const [props, leads, followUps, closed] = await Promise.all([
        (db.from('properties') as any)
          .select('id, estado_publicacion, disponibilidad', { count: 'exact' })
          .eq('company_id', companyId),
        (db.from('contacts') as any)
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('is_active', true)
          .gte('created_at', week),
        (db.from('contacts') as any)
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('is_active', true)
          .lte('fecha_seguimiento', today),
        (db.from('contacts') as any)
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('is_active', true)
          .eq('etapa_crm', 'cerrado')
          .gte('updated_at', month),
      ])

      const rows = props.data ?? []
      return {
        total_propiedades:      rows.length,
        propiedades_activas:    rows.filter((p: any) => p.estado_publicacion === 'activo' || p.estado_publicacion === 'destacado').length,
        propiedades_disponibles:rows.filter((p: any) => p.disponibilidad === 'disponible').length,
        propiedades_vendidas:   rows.filter((p: any) => p.disponibilidad === 'vendido').length,
        propiedades_alquiladas: rows.filter((p: any) => p.disponibilidad === 'alquilado').length,
        nuevos_leads_7d:        leads.count ?? 0,
        seguimientos_pendientes:followUps.count ?? 0,
        cerrados_este_mes:      closed.count ?? 0,
      }
    }

    // ── Create property ────────────────────────────────────────────────────
    case 'create_property': {
      if (!input.titulo)  throw new Error('titulo es requerido.')
      if (input.precio == null) throw new Error('precio es requerido.')

      const tipo = (input.tipo === 'arriendo' ? 'arriendo' : 'venta') as 'venta' | 'arriendo'
      const precio = Number(input.precio)
      if (!Number.isFinite(precio) || precio < 0) throw new Error('precio inválido.')

      const payload: Record<string, unknown> = {
        company_id:            companyId,
        titulo:                String(input.titulo),
        descripcion:           input.descripcion ?? null,
        tipo,
        for_sale:              tipo === 'venta',
        for_rent:              tipo === 'arriendo',
        for_transfer:          false,
        property_type_label:   input.tipo_inmueble ?? null,
        property_condition_label: input.condicion ?? null,
        precio,
        iso_currency:          input.moneda ?? 'USD',
        sale_price:            tipo === 'venta' ? precio : null,
        rent_price:            tipo === 'arriendo' ? precio : null,
        country_label:         input.pais ?? 'Panamá',
        ciudad:                input.ciudad ?? null,
        zona:                  input.zona ?? null,
        address:               input.direccion ?? null,
        bedrooms:              input.habitaciones != null ? Number(input.habitaciones) : null,
        bathrooms:             input.banos != null ? Number(input.banos) : null,
        garages:               input.garajes != null ? Number(input.garajes) : null,
        area:                  input.area != null ? String(input.area) : null,
        building_date:         input.anio ? String(input.anio) : null,
        estado_publicacion:    'inactivo',   // starts hidden until the agent reviews + adds photos
        disponibilidad:        'disponible',
        fuente:                'manual',
        gallery_urls:          [],
        canales_publicados:    [],
      }

      const { data, error } = await (db.from('properties') as any)
        .insert(payload)
        .select('id, codigo, titulo, tipo, precio, ciudad, zona, estado_publicacion')
        .single()
      if (error) throw new Error(error.message)

      // ── Optional: link an owner contact ──────────────────────────────────
      // Reuses an existing contact when the phone matches (no duplicates),
      // otherwise creates a new "propietario" contact. Then sets it as the
      // property owner and records a contact↔property link.
      let owner: { id: string; nombre: string; reused: boolean } | null = null
      const ownerNombre = input.propietario_nombre ? String(input.propietario_nombre).trim() : ''
      const ownerTelefono = input.propietario_telefono ? String(input.propietario_telefono).trim() : ''
      const ownerEmail = input.propietario_email ? String(input.propietario_email).trim() : ''

      if (ownerNombre || ownerTelefono) {
        const normPhone = ownerTelefono.replace(/\D/g, '')
        let ownerId: string | null = null
        let reused = false

        if (normPhone) {
          const { data: matches } = await (db.from('contacts') as any)
            .select('id, nombre, telefono, whatsapp')
            .eq('company_id', companyId)
            .or(`telefono.ilike.%${normPhone}%,whatsapp.ilike.%${normPhone}%`)
            .limit(10)
          const hit = (matches ?? []).find((c: any) =>
            (c.telefono ?? '').replace(/\D/g, '') === normPhone ||
            (c.whatsapp ?? '').replace(/\D/g, '') === normPhone)
          if (hit) { ownerId = hit.id; owner = { id: hit.id, nombre: hit.nombre, reused: true }; reused = true }
        }

        if (!ownerId) {
          const { data: newContact, error: cErr } = await (db.from('contacts') as any)
            .insert({
              company_id: companyId,
              nombre:     ownerNombre || 'Propietario',
              telefono:   ownerTelefono || null,
              email:      ownerEmail || null,
              tipo:       'propietario',
              fuente:     'manual',
              is_active:  true,
            })
            .select('id, nombre')
            .single()
          if (cErr) throw new Error(`Propiedad creada, pero falló crear el propietario: ${cErr.message}`)
          ownerId = newContact.id
          owner = { id: newContact.id, nombre: newContact.nombre, reused: false }
        }

        await (db.from('properties') as any)
          .update({ owner_contact_id: ownerId })
          .eq('id', data.id).eq('company_id', companyId)

        await (db.from('contact_property_links') as any)
          .insert({ company_id: companyId, contact_id: ownerId, property_id: data.id, interes: 'propietario' })
          .then((r: any) => r, () => {}) // ignore unique-constraint if already linked

        void reused
      }

      return {
        created: data,
        owner,
        edit_url: `/propiedades/${data.id}/editar`,
        nota: 'La propiedad se creó como INACTIVA (oculta de portales). Para subir fotos y luego publicarla, el agente debe abrir el enlace de edición. Las fotos no se pueden subir por el chat.',
      }
    }

    // ── Search properties ──────────────────────────────────────────────────
    case 'search_properties': {
      let q = (db.from('properties') as any)
        .select('id, titulo, tipo, precio, iso_currency, disponibilidad, estado_publicacion, ciudad, zona, bedrooms, bathrooms, area, agente_asignado_id, etapa_crm, updated_at, main_image_url')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(Number(input.limit ?? 20))

      if (input.disponibilidad) q = q.eq('disponibilidad', input.disponibilidad)
      if (input.estado)         q = q.eq('estado_publicacion', input.estado)
      if (input.tipo)           q = q.ilike('tipo', input.tipo as string)
      if (input.search)         q = q.ilike('titulo', `%${input.search}%`)
      if (input.ciudad)         q = q.ilike('ciudad', `%${input.ciudad}%`)
      if (input.precio_max)     q = q.lte('precio', Number(input.precio_max))
      if (input.precio_min)     q = q.gte('precio', Number(input.precio_min))
      if (input.bedrooms)       q = q.gte('bedrooms', Number(input.bedrooms))

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return { properties: data ?? [], count: data?.length ?? 0 }
    }

    // ── Property detail + notes ────────────────────────────────────────────
    case 'get_property_detail': {
      const { data: prop, error } = await (db.from('properties') as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('id', input.property_id)
        .single()
      if (error) throw new Error(error.message)

      const { data: notes } = await (db.from('property_notes') as any)
        .select('agent_nombre, contenido, created_at')
        .eq('company_id', companyId)
        .eq('property_id', input.property_id)
        .order('created_at', { ascending: false })
        .limit(10)

      return { property: prop, notes: notes ?? [] }
    }

    // ── Update property availability ───────────────────────────────────────
    case 'update_property_availability': {
      const allowed = ['disponible', 'vendido', 'alquilado']
      if (!allowed.includes(input.disponibilidad as string)) {
        throw new Error(`disponibilidad debe ser: ${allowed.join(', ')}`)
      }

      const patch: Record<string, unknown> = { disponibilidad: input.disponibilidad }
      if (input.disponibilidad === 'vendido' || input.disponibilidad === 'alquilado') {
        patch.estado_publicacion = 'inactivo'
      }

      const { data, error } = await (db.from('properties') as any)
        .update(patch)
        .eq('company_id', companyId)
        .eq('id', input.property_id)
        .select('id, titulo, disponibilidad, estado_publicacion')
        .single()
      if (error) throw new Error(error.message)
      return { updated: data }
    }

    // ── Update property CRM fields ─────────────────────────────────────────
    case 'update_property_crm': {
      const patch: Record<string, unknown> = {}
      if (input.etapa_crm)            patch.etapa_crm            = input.etapa_crm
      if (input.agente_asignado_id)   patch.agente_asignado_id   = input.agente_asignado_id
      if (input.fecha_seguimiento)    patch.fecha_seguimiento     = input.fecha_seguimiento

      if (Object.keys(patch).length === 0) throw new Error('No se proporcionaron campos a actualizar.')

      const { data, error } = await (db.from('properties') as any)
        .update(patch)
        .eq('company_id', companyId)
        .eq('id', input.property_id)
        .select('id, titulo, etapa_crm, agente_asignado_id, fecha_seguimiento')
        .single()
      if (error) throw new Error(error.message)
      return { updated: data }
    }

    // ── Add immutable note to property ─────────────────────────────────────
    case 'add_property_note': {
      if (!input.contenido) throw new Error('contenido es requerido.')

      const { data, error } = await (db.from('property_notes') as any)
        .insert({
          property_id:  input.property_id,
          company_id:   companyId,
          agent_nombre: 'PropSync AI',
          contenido:    String(input.contenido),
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return { note: data }
    }

    // ── Search contacts ────────────────────────────────────────────────────
    case 'search_contacts': {
      let q = (db.from('contacts') as any)
        .select('id, nombre, email, telefono, tipo, etapa_crm, agente_nombre, fecha_seguimiento, fuente, tags, presupuesto_min, presupuesto_max, ciudad, created_at')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(Number(input.limit ?? 30))

      if (input.etapa_crm)     q = q.eq('etapa_crm', input.etapa_crm)
      if (input.tipo)          q = q.eq('tipo', input.tipo)
      if (input.search)        q = q.or(`nombre.ilike.%${input.search}%,email.ilike.%${input.search}%,telefono.ilike.%${input.search}%`)
      if (input.followup_due)  q = q.lte('fecha_seguimiento', new Date().toISOString().slice(0, 10))

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return { contacts: data ?? [], count: data?.length ?? 0 }
    }

    // ── Contact detail + linked properties ────────────────────────────────
    case 'get_contact_detail': {
      const { data: contact, error } = await (db.from('contacts') as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('id', input.contact_id)
        .single()
      if (error) throw new Error(error.message)

      const { data: links } = await (db.from('contact_property_links') as any)
        .select('property_id, interes, created_at, properties(id, titulo, precio, disponibilidad)')
        .eq('company_id', companyId)
        .eq('contact_id', input.contact_id)

      return { contact, linked_properties: links ?? [] }
    }

    // ── Create contact ─────────────────────────────────────────────────────
    case 'create_contact': {
      if (!input.nombre) throw new Error('nombre es requerido.')

      const { data, error } = await (db.from('contacts') as any)
        .insert({
          company_id:         companyId,
          nombre:             input.nombre,
          email:              input.email              ?? null,
          telefono:           input.telefono           ?? null,
          whatsapp:           input.whatsapp           ?? null,
          tipo:               input.tipo               ?? 'cliente',
          ciudad:             input.ciudad             ?? null,
          zona_interes:       input.zona_interes       ?? null,
          tipo_operacion:     input.tipo_operacion     ?? 'compra',
          presupuesto_min:    input.presupuesto_min    ?? null,
          presupuesto_max:    input.presupuesto_max    ?? null,
          etapa_crm:          input.etapa_crm          ?? 'nuevo_lead',
          agente_asignado_id: input.agente_asignado_id ?? null,
          fecha_seguimiento:  input.fecha_seguimiento  ?? null,
          fuente:             'manual',
          notas:              input.notas              ?? null,
          tags:               (input.tags as string[]) ?? [],
          is_active:          true,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return { contact: data }
    }

    // ── Update contact ─────────────────────────────────────────────────────
    case 'update_contact': {
      const allowed = ['nombre','email','telefono','whatsapp','tipo','ciudad','zona_interes','tipo_operacion','presupuesto_min','presupuesto_max','etapa_crm','agente_asignado_id','agente_nombre','fecha_seguimiento','notas','tags','is_active']
      const patch: Record<string, unknown> = {}
      for (const key of allowed) {
        if (input[key] !== undefined) patch[key] = input[key]
      }
      if (Object.keys(patch).length === 0) throw new Error('No se proporcionaron campos a actualizar.')

      const { data, error } = await (db.from('contacts') as any)
        .update(patch)
        .eq('company_id', companyId)
        .eq('id', input.contact_id)
        .select('id, nombre, etapa_crm, agente_nombre, fecha_seguimiento')
        .single()
      if (error) throw new Error(error.message)
      return { updated: data }
    }

    // ── CRM stages ────────────────────────────────────────────────────────
    case 'get_crm_stages': {
      const { data, error } = await (db.from('crm_stages') as any)
        .select('id, nombre, slug, color, position, is_terminal')
        .eq('company_id', companyId)
        .order('position', { ascending: true })
      if (error) throw new Error(error.message)
      return { stages: data ?? [] }
    }

    // ── Pending follow-ups ────────────────────────────────────────────────
    case 'get_pending_followups': {
      const today = new Date().toISOString().slice(0, 10)

      // Get terminal stage slugs to exclude
      const { data: stages } = await (db.from('crm_stages') as any)
        .select('slug')
        .eq('company_id', companyId)
        .eq('is_terminal', true)
      const terminalSlugs = (stages ?? []).map((s: any) => s.slug)

      let q = (db.from('contacts') as any)
        .select('id, nombre, telefono, etapa_crm, fecha_seguimiento, agente_nombre')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .lte('fecha_seguimiento', today)
        .order('fecha_seguimiento', { ascending: true })
        .limit(50)

      if (terminalSlugs.length > 0) q = q.not('etapa_crm', 'in', `(${terminalSlugs.map((s: string) => `"${s}"`).join(',')})`)

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return { pending: data ?? [], count: data?.length ?? 0, as_of: today }
    }

    // ── List agents ───────────────────────────────────────────────────────
    case 'list_agents': {
      const { data, error } = await (db.from('agents') as any)
        .select('id, nombre, email, rol, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('nombre', { ascending: true })
      if (error) throw new Error(error.message)
      return { agents: data ?? [] }
    }

    // ── Link a contact to a property ───────────────────────────────────────
    case 'link_contact_property': {
      if (!input.contact_id)  throw new Error('contact_id es requerido.')
      if (!input.property_id) throw new Error('property_id es requerido.')
      const allowed = ['interesado', 'propietario', 'visitó', 'ofertó', 'descartado']
      const interes = allowed.includes(input.interes as string) ? input.interes : 'interesado'

      // Confirm both belong to this company.
      const [{ data: contact }, { data: property }] = await Promise.all([
        (db.from('contacts') as any).select('id, nombre').eq('id', input.contact_id).eq('company_id', companyId).single(),
        (db.from('properties') as any).select('id, titulo').eq('id', input.property_id).eq('company_id', companyId).single(),
      ])
      if (!contact)  throw new Error('Contacto no encontrado.')
      if (!property) throw new Error('Propiedad no encontrada.')

      const { error } = await (db.from('contact_property_links') as any)
        .insert({ company_id: companyId, contact_id: input.contact_id, property_id: input.property_id, interes })
      if (error && error.code !== '23505') throw new Error(error.message)  // 23505 = already linked

      return {
        linked: true,
        already_linked: error?.code === '23505',
        contacto: contact.nombre,
        propiedad: property.titulo,
        interes,
      }
    }

    // ── Match properties for a contact ─────────────────────────────────────
    case 'match_properties_for_contact': {
      if (!input.contact_id) throw new Error('contact_id es requerido.')

      const { data: contact, error: cErr } = await (db.from('contacts') as any)
        .select('*').eq('id', input.contact_id).eq('company_id', companyId).single()
      if (cErr || !contact) throw new Error('Contacto no encontrado.')

      const { data: props, error: pErr } = await (db.from('properties') as any)
        .select('id, titulo, precio, tipo, ciudad, zona, bedrooms, bathrooms, estado_publicacion, disponibilidad, main_image_url')
        .eq('company_id', companyId)
        .eq('disponibilidad', 'disponible')
        .in('estado_publicacion', ['activo', 'destacado'])
      if (pErr) throw new Error(pErr.message)

      const matches = matchPropertiesForContact(
        (props ?? []) as PropertyForMatch[],
        contact as Contact,
        Number(input.limit ?? 5),
      )

      return {
        contacto: contact.nombre,
        criterios: {
          tipo_operacion: contact.tipo_operacion,
          presupuesto_min: contact.presupuesto_min,
          presupuesto_max: contact.presupuesto_max,
          ciudad: contact.ciudad,
          zona_interes: contact.zona_interes,
        },
        matches: matches.map((m) => ({
          property_id: m.property.id,
          titulo: m.property.titulo,
          precio: m.property.precio,
          tipo: m.property.tipo,
          zona: m.property.zona,
          ciudad: m.property.ciudad,
          score: m.score,
          razones: m.reasons,
        })),
        count: matches.length,
      }
    }

    // ── Add a note to a contact ────────────────────────────────────────────
    case 'add_contact_note': {
      if (!input.contact_id) throw new Error('contact_id es requerido.')
      if (!input.contenido)  throw new Error('contenido es requerido.')

      const { data: contact } = await (db.from('contacts') as any)
        .select('id').eq('id', input.contact_id).eq('company_id', companyId).single()
      if (!contact) throw new Error('Contacto no encontrado.')

      const { data, error } = await (db.from('contact_notes') as any)
        .insert({
          contact_id:   input.contact_id,
          company_id:   companyId,
          agent_nombre: 'PropSync AI',
          contenido:    String(input.contenido),
        })
        .select('id, contenido, created_at')
        .single()
      if (error) throw new Error(error.message)
      return { note: data }
    }

    // ── Schedule a follow-up for a contact ─────────────────────────────────
    case 'schedule_followup': {
      if (!input.contact_id) throw new Error('contact_id es requerido.')

      // Accept an explicit date (YYYY-MM-DD) or a relative number of days.
      let fecha: string
      if (input.fecha) {
        fecha = String(input.fecha)
      } else if (input.en_dias != null) {
        const d = new Date()
        d.setDate(d.getDate() + Number(input.en_dias))
        fecha = d.toISOString().slice(0, 10)
      } else {
        throw new Error('Indica "fecha" (YYYY-MM-DD) o "en_dias" (número de días desde hoy).')
      }

      const patch: Record<string, unknown> = { fecha_seguimiento: fecha }
      if (input.etapa_crm) patch.etapa_crm = input.etapa_crm

      const { data, error } = await (db.from('contacts') as any)
        .update(patch)
        .eq('id', input.contact_id)
        .eq('company_id', companyId)
        .select('id, nombre, fecha_seguimiento, etapa_crm')
        .single()
      if (error) throw new Error(error.message)

      // Optionally leave a note so the reason is recorded.
      if (input.motivo) {
        await (db.from('contact_notes') as any).insert({
          contact_id:   input.contact_id,
          company_id:   companyId,
          agent_nombre: 'PropSync AI',
          contenido:    `Seguimiento programado para ${fecha}: ${input.motivo}`,
        })
      }

      return { scheduled: data }
    }

    default:
      throw new Error(`Herramienta desconocida: ${name}`)
  }
}

// ── Tool definitions for Claude ───────────────────────────────────────────────

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_dashboard_stats',
    description: 'Obtiene estadísticas generales: total de propiedades, cuántas están activas y disponibles, nuevos leads de los últimos 7 días, seguimientos pendientes y cierres de este mes.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'search_properties',
    description: 'Busca propiedades del inventario con filtros opcionales. Úsala para responder preguntas sobre propiedades disponibles, vendidas, de venta/arriendo, por ciudad o precio.',
    input_schema: {
      type: 'object',
      properties: {
        search:         { type: 'string',  description: 'Texto libre en el título de la propiedad' },
        tipo:           { type: 'string',  description: '"venta" o "arriendo"' },
        disponibilidad: { type: 'string',  description: '"disponible", "vendido" o "alquilado"' },
        estado:         { type: 'string',  description: '"activo", "destacado" o "inactivo"' },
        ciudad:         { type: 'string',  description: 'Filtrar por ciudad (búsqueda parcial)' },
        precio_min:     { type: 'number',  description: 'Precio mínimo' },
        precio_max:     { type: 'number',  description: 'Precio máximo' },
        bedrooms:       { type: 'number',  description: 'Mínimo de habitaciones' },
        limit:          { type: 'number',  description: 'Máximo de resultados (default 20)' },
      },
      required: [],
    },
  },
  {
    name: 'create_property',
    description: 'Crea una nueva propiedad en el inventario a partir de la información que da el usuario. Se crea como INACTIVA (oculta de portales) para que el agente revise y suba fotos antes de publicarla. IMPORTANTE: las fotos NO se pueden subir por el chat — después de crearla, indícale al usuario que abra el enlace de edición (edit_url) para subir las fotos y activar la propiedad. Pide los datos que falten (al menos título y precio) antes de crear.',
    input_schema: {
      type: 'object',
      properties: {
        titulo:        { type: 'string', description: 'Título de la propiedad (requerido). Ej: "Apartamento 2 hab en Marbella"' },
        precio:        { type: 'number', description: 'Precio (requerido). Para venta el precio total; para arriendo el precio mensual.' },
        tipo:          { type: 'string', description: '"venta" (default) o "arriendo"' },
        moneda:        { type: 'string', description: 'Código de moneda, "USD" (default) o "PAB"' },
        tipo_inmueble: { type: 'string', description: 'Tipo: Apartamento, Casa, Local Comercial, Oficina, Terreno, etc.' },
        condicion:     { type: 'string', description: 'Estado: Nuevo, Usado, En planos, En construcción, Remodelar' },
        descripcion:   { type: 'string', description: 'Descripción de la propiedad' },
        pais:          { type: 'string', description: 'País (default "Panamá")' },
        ciudad:        { type: 'string', description: 'Ciudad' },
        zona:          { type: 'string', description: 'Zona o barrio' },
        direccion:     { type: 'string', description: 'Dirección completa' },
        habitaciones:  { type: 'number', description: 'Número de habitaciones' },
        banos:         { type: 'number', description: 'Número de baños' },
        garajes:       { type: 'number', description: 'Número de garajes/estacionamientos' },
        area:          { type: 'number', description: 'Área total en m²' },
        anio:          { type: 'number', description: 'Año de construcción' },
        propietario_nombre:   { type: 'string', description: 'Nombre del propietario (opcional). Si se da, se vincula como propietario de la propiedad — reutiliza el contacto si el teléfono ya existe, o crea uno nuevo tipo "propietario".' },
        propietario_telefono: { type: 'string', description: 'Teléfono del propietario (opcional)' },
        propietario_email:    { type: 'string', description: 'Email del propietario (opcional)' },
      },
      required: ['titulo', 'precio'],
    },
  },
  {
    name: 'get_property_detail',
    description: 'Obtiene todos los detalles de una propiedad específica, incluyendo sus últimas notas.',
    input_schema: {
      type: 'object',
      properties: {
        property_id: { type: 'string', description: 'UUID de la propiedad' },
      },
      required: ['property_id'],
    },
  },
  {
    name: 'update_property_availability',
    description: 'Cambia la disponibilidad de una propiedad: disponible, vendido o alquilado. Cuando se marca vendida o alquilada, también se inactiva automáticamente (se oculta de los portales).',
    input_schema: {
      type: 'object',
      properties: {
        property_id:    { type: 'string', description: 'UUID de la propiedad' },
        disponibilidad: { type: 'string', description: '"disponible", "vendido" o "alquilado"' },
      },
      required: ['property_id', 'disponibilidad'],
    },
  },
  {
    name: 'update_property_crm',
    description: 'Actualiza los campos CRM de una propiedad: etapa del pipeline, agente asignado o fecha de seguimiento.',
    input_schema: {
      type: 'object',
      properties: {
        property_id:         { type: 'string', description: 'UUID de la propiedad' },
        etapa_crm:           { type: 'string', description: 'Etapa CRM: prospecto, contactado, visita, oferta, negociando, cerrado' },
        agente_asignado_id:  { type: 'string', description: 'UUID del agente a asignar' },
        fecha_seguimiento:   { type: 'string', description: 'Fecha de seguimiento en formato YYYY-MM-DD' },
      },
      required: ['property_id'],
    },
  },
  {
    name: 'add_property_note',
    description: 'Agrega una nota permanente a una propiedad. Las notas son inmutables (no se pueden editar ni eliminar).',
    input_schema: {
      type: 'object',
      properties: {
        property_id: { type: 'string', description: 'UUID de la propiedad' },
        contenido:   { type: 'string', description: 'Texto de la nota' },
      },
      required: ['property_id', 'contenido'],
    },
  },
  {
    name: 'search_contacts',
    description: 'Busca contactos/leads del CRM con filtros opcionales. Úsala para listar leads, buscar por nombre, filtrar por etapa o ver quién tiene seguimiento pendiente.',
    input_schema: {
      type: 'object',
      properties: {
        search:       { type: 'string',  description: 'Búsqueda en nombre, email o teléfono' },
        etapa_crm:    { type: 'string',  description: 'Filtrar por slug de etapa (ej: "nuevo_lead", "contactado")' },
        tipo:         { type: 'string',  description: '"cliente", "propietario" o "broker"' },
        followup_due: { type: 'boolean', description: 'Si true, solo contactos con seguimiento vencido o de hoy' },
        limit:        { type: 'number',  description: 'Máximo de resultados (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_contact_detail',
    description: 'Obtiene el perfil completo de un contacto y las propiedades que tiene vinculadas.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'UUID del contacto' },
      },
      required: ['contact_id'],
    },
  },
  {
    name: 'create_contact',
    description: 'Crea un nuevo lead o contacto en el CRM.',
    input_schema: {
      type: 'object',
      properties: {
        nombre:             { type: 'string', description: 'Nombre completo (requerido)' },
        email:              { type: 'string', description: 'Email' },
        telefono:           { type: 'string', description: 'Teléfono' },
        whatsapp:           { type: 'string', description: 'Número WhatsApp' },
        tipo:               { type: 'string', description: '"cliente" (default), "propietario" o "broker"' },
        ciudad:             { type: 'string', description: 'Ciudad de interés' },
        zona_interes:       { type: 'string', description: 'Zona o sector de interés' },
        tipo_operacion:     { type: 'string', description: '"compra" (default), "alquiler" o "ambas"' },
        presupuesto_min:    { type: 'number', description: 'Presupuesto mínimo' },
        presupuesto_max:    { type: 'number', description: 'Presupuesto máximo' },
        etapa_crm:          { type: 'string', description: 'Etapa inicial (default: "nuevo_lead")' },
        agente_asignado_id: { type: 'string', description: 'UUID del agente a asignar' },
        fecha_seguimiento:  { type: 'string', description: 'Fecha de seguimiento YYYY-MM-DD' },
        notas:              { type: 'string', description: 'Notas iniciales' },
      },
      required: ['nombre'],
    },
  },
  {
    name: 'update_contact',
    description: 'Actualiza campos de un contacto existente: etapa CRM, agente asignado, fecha de seguimiento, datos de contacto, tags, etc.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id:         { type: 'string',  description: 'UUID del contacto' },
        nombre:             { type: 'string',  description: 'Nuevo nombre' },
        email:              { type: 'string',  description: 'Nuevo email' },
        telefono:           { type: 'string',  description: 'Nuevo teléfono' },
        etapa_crm:          { type: 'string',  description: 'Slug de la nueva etapa' },
        agente_asignado_id: { type: 'string',  description: 'UUID del agente' },
        agente_nombre:      { type: 'string',  description: 'Nombre del agente (texto libre)' },
        fecha_seguimiento:  { type: 'string',  description: 'YYYY-MM-DD' },
        notas:              { type: 'string',  description: 'Notas adicionales' },
        is_active:          { type: 'boolean', description: 'false para desactivar (nunca elimina)' },
      },
      required: ['contact_id'],
    },
  },
  {
    name: 'get_crm_stages',
    description: 'Lista todas las etapas configuradas en el pipeline CRM, ordenadas por posición.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_pending_followups',
    description: 'Lista los contactos cuya fecha de seguimiento es hoy o está vencida, y que no están en etapas terminales (cerrado, descartado, etc.).',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_agents',
    description: 'Lista todos los agentes activos del equipo con su nombre, email y rol.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'link_contact_property',
    description: 'Vincula un contacto/cliente con una propiedad (ej: marcar que un cliente está interesado en una propiedad, que la visitó, ofertó, o es el propietario). Necesitas el UUID del contacto y de la propiedad — búscalos primero con search_contacts y search_properties si solo tienes nombres.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id:  { type: 'string', description: 'UUID del contacto' },
        property_id: { type: 'string', description: 'UUID de la propiedad' },
        interes:     { type: 'string', description: 'Tipo de relación: "interesado" (default), "propietario", "visitó", "ofertó" o "descartado"' },
      },
      required: ['contact_id', 'property_id'],
    },
  },
  {
    name: 'match_properties_for_contact',
    description: 'Sugiere las propiedades del inventario que mejor encajan con lo que busca un cliente, según su presupuesto, tipo de operación (compra/alquiler) y zona/ciudad de interés. Devuelve un puntaje y las razones del match. Usa search_contacts primero si solo tienes el nombre del cliente.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'UUID del contacto/cliente' },
        limit:      { type: 'number', description: 'Máximo de propiedades sugeridas (default 5)' },
      },
      required: ['contact_id'],
    },
  },
  {
    name: 'add_contact_note',
    description: 'Agrega una nota a un contacto/cliente del CRM (ej: "llamó y quiere visita el sábado", "pidió rebaja"). Las notas quedan en el historial del contacto.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'UUID del contacto' },
        contenido:  { type: 'string', description: 'Texto de la nota' },
      },
      required: ['contact_id', 'contenido'],
    },
  },
  {
    name: 'schedule_followup',
    description: 'Programa un seguimiento/recordatorio para un contacto. Acepta una fecha exacta (YYYY-MM-DD) o un número de días desde hoy (en_dias). Opcionalmente registra el motivo como nota.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'UUID del contacto' },
        fecha:      { type: 'string', description: 'Fecha exacta del seguimiento en formato YYYY-MM-DD' },
        en_dias:    { type: 'number', description: 'Alternativa: número de días desde hoy (ej: 3 = en 3 días)' },
        motivo:     { type: 'string', description: 'Motivo del seguimiento (se guarda como nota, opcional)' },
        etapa_crm:  { type: 'string', description: 'Slug de etapa a la que mover el contacto (opcional)' },
      },
      required: ['contact_id'],
    },
  },
]
