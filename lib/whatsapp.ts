/**
 * WhatsApp Business Cloud API client
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const META_API_BASE = 'https://graph.facebook.com/v21.0'

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface InboundMessage {
  waMessageId: string
  from: string
  timestamp: string
  type: 'text' | 'image' | 'audio' | 'document' | 'button' | 'interactive' | 'unknown'
  text?: string
  buttonText?: string
  raw: Record<string, unknown>
}

export interface InboundStatus {
  waMessageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  recipientPhone: string
  timestamp: string
  errorMessage?: string
}

interface SendConfig {
  phoneNumberId: string
  accessToken: string
}

/**
 * Envía un mensaje de texto simple. Solo funciona en una ventana de conversación abierta.
 */
export async function sendTextMessage(
  config: SendConfig,
  toPhone: string,
  body: string,
): Promise<WhatsAppSendResult> {
  return sendRequest(config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(toPhone),
    type: 'text',
    text: { preview_url: false, body },
  })
}

/**
 * Envía un template aprobado (necesario para iniciar conversaciones fuera de la ventana de 24h).
 */
export async function sendTemplate(
  config: SendConfig,
  toPhone: string,
  templateName: string,
  languageCode: string = 'es',
  components: TemplateComponent[] = [],
): Promise<WhatsAppSendResult> {
  return sendRequest(config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(toPhone),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  })
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  sub_type?: 'quick_reply' | 'url'
  index?: number
  parameters?: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: { link: string } }
    | { type: 'payload'; payload: string }
  >
}

async function sendRequest(
  config: SendConfig,
  body: Record<string, unknown>,
): Promise<WhatsAppSendResult> {
  try {
    const res = await fetch(`${META_API_BASE}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      const errorMsg = data?.error?.message ?? `HTTP ${res.status}`
      return { success: false, error: errorMsg }
    }

    const messageId = data?.messages?.[0]?.id
    return { success: true, messageId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMsg }
  }
}

/**
 * Normaliza un número de teléfono al formato E.164 sin '+' (lo que espera Meta Cloud API).
 * Ej: "+507 1234-5678" → "50712345678"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Parsea un payload entrante del webhook WhatsApp.
 * Un payload puede contener múltiples mensajes y/o updates de estado.
 */
export function parseInboundWebhook(payload: any): {
  messages: InboundMessage[]
  statuses: InboundStatus[]
  phoneNumberId: string | null
} {
  const messages: InboundMessage[] = []
  const statuses: InboundStatus[] = []
  let phoneNumberId: string | null = null

  const entries: any[] = payload?.entry ?? []
  for (const entry of entries) {
    const changes: any[] = entry?.changes ?? []
    for (const change of changes) {
      const value = change?.value
      if (!value) continue

      phoneNumberId = value?.metadata?.phone_number_id ?? phoneNumberId

      // Mensajes entrantes
      const inboundMessages: any[] = value?.messages ?? []
      for (const msg of inboundMessages) {
        const parsed = parseInboundMessage(msg)
        if (parsed) messages.push(parsed)
      }

      // Updates de estado de mensajes enviados
      const inboundStatuses: any[] = value?.statuses ?? []
      for (const st of inboundStatuses) {
        statuses.push({
          waMessageId: st.id,
          status: st.status,
          recipientPhone: st.recipient_id,
          timestamp: st.timestamp,
          errorMessage: st.errors?.[0]?.message,
        })
      }
    }
  }

  return { messages, statuses, phoneNumberId }
}

function parseInboundMessage(msg: any): InboundMessage | null {
  if (!msg?.id || !msg?.from) return null

  const base = {
    waMessageId: msg.id,
    from: msg.from,
    timestamp: msg.timestamp,
    raw: msg,
  }

  switch (msg.type) {
    case 'text':
      return { ...base, type: 'text', text: msg.text?.body ?? '' }
    case 'button':
      return { ...base, type: 'button', text: msg.button?.text ?? '', buttonText: msg.button?.text }
    case 'interactive':
      return {
        ...base,
        type: 'interactive',
        text: msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? '',
      }
    case 'image':
      return { ...base, type: 'image', text: msg.image?.caption ?? '' }
    case 'audio':
      return { ...base, type: 'audio' }
    case 'document':
      return { ...base, type: 'document', text: msg.document?.caption ?? msg.document?.filename ?? '' }
    default:
      return { ...base, type: 'unknown' }
  }
}

/**
 * Detecta intent básico de la respuesta del propietario sobre disponibilidad.
 * Retorna el WhatsAppResponse correspondiente.
 */
export function detectAvailabilityIntent(text: string): 'disponible' | 'vendida' | 'no_disponible' | 'sin_respuesta' {
  const t = text.toLowerCase().trim()

  // Palabras clave de disponibilidad
  if (/\b(sí|si|disponible|sigue|aun|aún|todavía|todavia|claro|por supuesto)\b/i.test(t)) {
    return 'disponible'
  }

  // Palabras clave de venta
  if (/\b(vendid[ao]|alquilad[ao]|rentad[ao])\b/i.test(t)) {
    return 'vendida'
  }

  // Palabras clave de no disponible
  if (/\b(no|ya no|retirada|fuera|cancelad[ao]|no disponible)\b/i.test(t)) {
    return 'no_disponible'
  }

  return 'sin_respuesta'
}
