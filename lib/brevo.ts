/**
 * Brevo (ex-Sendinblue) transactional email — platform level only.
 *
 * This is the "cuenta madre" transport: one Brevo account owned by Elevare,
 * configured through env vars, used for every tenant that hasn't connected its
 * own SMTP. Tenants cannot see or change these credentials, and there is
 * deliberately no per-company Brevo UI — a client pasting a bad API key would
 * silently break every email the platform sends on their behalf.
 *
 * Why the HTTP API instead of Brevo's SMTP relay (which the existing nodemailer
 * path already supports via SMTP_HOST=smtp-relay.brevo.com): the API reports
 * per-message delivery errors synchronously and carries the tags/message-id we
 * need for marketing sends, which SMTP does not.
 */

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export interface BrevoSender {
  email: string
  name: string
}

/** True when the mother account is configured. */
export function isBrevoEnabled(): boolean {
  return Boolean(process.env.BREVO_API_KEY && brevoSender())
}

export function brevoSender(): BrevoSender | null {
  const email = process.env.BREVO_FROM_EMAIL ?? process.env.SMTP_FROM_EMAIL
  if (!email) return null
  return { email, name: process.env.BREVO_FROM_NAME ?? process.env.SMTP_FROM_NAME ?? 'PropSync' }
}

export async function sendViaBrevo({
  to,
  toName,
  subject,
  htmlContent,
  tags,
}: {
  to: string
  toName: string
  subject: string
  htmlContent: string
  tags?: string[]
}): Promise<{ ok: true; messageId: string | null } | { ok: false; error: string }> {
  const apiKey = process.env.BREVO_API_KEY
  const sender = brevoSender()
  if (!apiKey || !sender) return { ok: false, error: 'Brevo no está configurado' }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to, name: toName }],
        subject,
        htmlContent,
        ...(tags?.length ? { tags } : {}),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Brevo ${res.status}: ${body.slice(0, 300)}` }
    }
    const data = (await res.json()) as { messageId?: string }
    return { ok: true, messageId: data.messageId ?? null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Cheap credential check for the platform-status card in Configuración. */
export async function verifyBrevo(): Promise<{ ok: true; account: string } | { ok: false; error: string }> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { ok: false, error: 'Falta BREVO_API_KEY' }
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': apiKey, accept: 'application/json' },
    })
    if (!res.ok) return { ok: false, error: `Brevo ${res.status}` }
    const data = (await res.json()) as { email?: string; companyName?: string }
    return { ok: true, account: data.companyName ?? data.email ?? 'cuenta Brevo' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
