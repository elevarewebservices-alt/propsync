import crypto from 'crypto'

const GRAPH = 'https://graph.facebook.com/v21.0'

// ── Send a plain text message via the WhatsApp Cloud API ──────────────────────
export async function sendText(to: string, body: string): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!
  const token = process.env.WHATSAPP_ACCESS_TOKEN!

  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: body.slice(0, 4096) }, // WhatsApp text limit
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[whatsapp] sendText failed:', res.status, err)
    throw new Error(`WhatsApp send failed: ${res.status}`)
  }
}

// ── Verify the webhook signature (X-Hub-Signature-256) ────────────────────────
// Meta signs the raw request body with your app secret. Always verify in prod.
export function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret || !signature) return false
  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ── Parse an inbound webhook payload into a simple message shape ──────────────
export interface InboundMessage {
  from: string          // sender's WhatsApp number
  name: string | null   // sender's profile name
  text: string          // message text
  messageId: string
  phoneNumberId: string // which business number received it (multi-tenant key)
}

export function parseInbound(payload: any): InboundMessage | null {
  try {
    const entry = payload.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const msg = value?.messages?.[0]
    if (!msg || msg.type !== 'text') return null

    return {
      from: msg.from,
      name: value?.contacts?.[0]?.profile?.name ?? null,
      text: msg.text?.body ?? '',
      messageId: msg.id,
      phoneNumberId: value?.metadata?.phone_number_id ?? '',
    }
  } catch {
    return null
  }
}
