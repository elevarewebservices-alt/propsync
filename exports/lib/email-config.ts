import { createAdminClient } from './supabase'
import { decrypt } from './crypto'

export interface SmtpConfig {
  host:      string
  port:      number
  secure:    boolean
  user:      string
  password:  string
  fromEmail: string
  fromName:  string
}

function platformDefault(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  if (!host || !user || !pass) return null
  return {
    host,
    port:      parseInt(process.env.SMTP_PORT ?? '587'),
    secure:    process.env.SMTP_SECURE === 'true',
    user,
    password:  pass,
    fromEmail: process.env.SMTP_FROM_EMAIL ?? user,
    fromName:  process.env.SMTP_FROM_NAME  ?? 'PropSync',
  }
}

/**
 * Resolve SMTP config for sending. If `companyId` is provided and the company
 * has a configured SMTP, use it. Otherwise fall back to platform defaults
 * (used during onboarding before a tenant has connected their email).
 */
export async function resolveSmtpConfig(companyId?: string | null): Promise<SmtpConfig | null> {
  if (companyId) {
    const db = createAdminClient()
    const { data } = await (db.from('companies') as any)
      .select('smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password_enc, smtp_from_email, smtp_from_name')
      .eq('id', companyId)
      .single()

    const c = data as any
    if (c?.smtp_host && c?.smtp_user && c?.smtp_password_enc) {
      try {
        return {
          host:      c.smtp_host,
          port:      c.smtp_port ?? 587,
          secure:    c.smtp_secure ?? false,
          user:      c.smtp_user,
          password:  decrypt(c.smtp_password_enc),
          fromEmail: c.smtp_from_email ?? c.smtp_user,
          fromName:  c.smtp_from_name  ?? 'PropSync',
        }
      } catch {
        // fall through to platform default
      }
    }
  }
  return platformDefault()
}
