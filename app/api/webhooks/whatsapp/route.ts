import { createAdminClient } from '@/lib/supabase'
import { parseInboundWebhook, detectAvailabilityIntent, normalizePhone } from '@/lib/whatsapp'
import { checkWebhookRateLimit, getClientIp, rateLimited } from '@/lib/rate-limit'

/**
 * GET — webhook verification handshake from Meta.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const challenge = searchParams.get('hub.challenge')
  const verify = searchParams.get('hub.verify_token')
  const token = searchParams.get('token')

  if (!token) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any)
    .select('id')
    .eq('whatsapp_webhook_token', token)
    .single()

  if (!company) return new Response('Unauthorized', { status: 401 })

  if (mode === 'subscribe' && verify === token) {
    return new Response(challenge ?? '', { status: 200 })
  }

  return new Response('OK', { status: 200 })
}

/**
 * POST — inbound messages and status updates from WhatsApp.
 */
export async function POST(request: Request) {
  const rl = checkWebhookRateLimit(getClientIp(request))
  if (!rl.allowed) return Response.json({ error: 'Too many requests' }, { status: 429, ...rateLimited(rl.resetAt) })

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any)
    .select('id')
    .eq('whatsapp_webhook_token', token)
    .single()

  if (!company) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = (company as any).id

  let payload: any
  try {
    payload = await request.json()
  } catch {
    return Response.json({ success: true })
  }

  const { messages, statuses } = parseInboundWebhook(payload)

  // Procesar mensajes entrantes
  for (const msg of messages) {
    await processInboundMessage(db, companyId, msg)
  }

  // Procesar status updates de mensajes outbound
  for (const st of statuses) {
    await (db.from('whatsapp_messages') as any)
      .update({ status: st.status, error_message: st.errorMessage ?? null })
      .eq('wa_message_id', st.waMessageId)
      .eq('company_id', companyId)
  }

  return Response.json({ success: true })
}

async function processInboundMessage(db: any, companyId: string, msg: {
  waMessageId: string
  from: string
  timestamp: string
  type: string
  text?: string
  raw: Record<string, unknown>
}) {
  const phone = msg.from
  const text = msg.text ?? ''

  // Buscar contacto por teléfono o whatsapp
  const { data: existingContacts } = await (db.from('contacts') as any)
    .select('id, nombre')
    .eq('company_id', companyId)
    .or(`telefono.eq.${phone},whatsapp.eq.${phone}`)
    .limit(1)

  const contactId = existingContacts?.[0]?.id ?? null

  // Buscar propiedad relacionada por teléfono del propietario
  const { data: relatedProperties } = await (db.from('properties') as any)
    .select('id, titulo, whatsapp_estado')
    .eq('company_id', companyId)
    .eq('telefono_propietario', phone)
    .limit(1)

  const property = relatedProperties?.[0] ?? null

  // Guardar el mensaje
  await (db.from('whatsapp_messages') as any).insert({
    company_id: companyId,
    contact_id: contactId,
    property_id: property?.id ?? null,
    direction: 'inbound',
    wa_message_id: msg.waMessageId,
    phone_number: phone,
    message_type: msg.type,
    body: text,
    raw_payload: msg.raw,
  })

  // Si hay propiedad relacionada, detectar intent de disponibilidad y actualizar
  if (property && text) {
    const intent = detectAvailabilityIntent(text)
    if (intent !== 'sin_respuesta') {
      const updates: Record<string, unknown> = {
        whatsapp_estado: intent === 'disponible' ? 'disponible'
          : intent === 'vendida' ? 'vendida'
          : 'no_disponible',
      }

      // Si dice vendida, marcar disponibilidad
      if (intent === 'vendida') {
        updates.disponibilidad = 'vendido'
        updates.estado_publicacion = 'inactivo'
      } else if (intent === 'no_disponible') {
        updates.estado_publicacion = 'inactivo'
      }

      await (db.from('properties') as any)
        .update(updates)
        .eq('id', property.id)
    }
  }

  // Si hay contacto, también guardar como nota
  if (contactId && text) {
    await (db.from('contact_notes') as any).insert({
      contact_id: contactId,
      company_id: companyId,
      agent_nombre: 'WhatsApp',
      contenido: `[WhatsApp] ${text}`,
    })
  }
}
