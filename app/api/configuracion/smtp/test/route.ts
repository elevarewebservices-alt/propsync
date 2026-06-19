import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId, getSessionAgent } from '@/lib/auth'
import { decrypt } from '@/lib/crypto'
import { verifySmtpConfig, sendRawEmail } from '@/lib/email'
import type { SmtpConfig } from '@/lib/email-config'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const companyId = await resolveCompanyId()
  const me        = await getSessionAgent()

  if (!['owner', 'admin'].includes((me as any)?.rol ?? '')) {
    return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 })
  }

  const body = await request.json() as { sendTo?: string }
  const db   = createAdminClient()

  const { data } = await (db.from('companies') as any)
    .select('smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password_enc, smtp_from_email, smtp_from_name')
    .eq('id', companyId)
    .single()

  const c = data as any
  if (!c?.smtp_host || !c?.smtp_user || !c?.smtp_password_enc) {
    return NextResponse.json({ error: 'Falta configurar el correo. Guarda primero usuario y contraseña.' }, { status: 400 })
  }

  let password: string
  try {
    password = decrypt(c.smtp_password_enc)
  } catch {
    return NextResponse.json({ error: 'No se pudo desencriptar la contraseña guardada. Vuelve a guardarla.' }, { status: 500 })
  }

  const cfg: SmtpConfig = {
    host:      c.smtp_host,
    port:      c.smtp_port ?? 587,
    secure:    c.smtp_secure ?? false,
    user:      c.smtp_user,
    password,
    fromEmail: c.smtp_from_email ?? c.smtp_user,
    fromName:  c.smtp_from_name  ?? 'PropSync',
  }

  const verify = await verifySmtpConfig(cfg)
  if (!verify.ok) {
    return NextResponse.json({ error: `No se pudo conectar al servidor SMTP: ${verify.error}` }, { status: 400 })
  }

  const sendTo = body.sendTo?.trim() || (me as any)?.email
  if (!sendTo) {
    return NextResponse.json({ error: 'No se encontró un destinatario para la prueba.' }, { status: 400 })
  }

  try {
    await sendRawEmail(
      cfg,
      sendTo,
      'Prueba de correo — PropSync',
      `<div style="font-family:Arial,sans-serif;padding:24px;max-width:520px;margin:auto;">
        <h2 style="color:#1a73e8;margin:0 0 12px;">¡Funciona!</h2>
        <p style="font-size:14px;color:#475569;line-height:1.6;">
          Tu correo está conectado correctamente. A partir de ahora todas las notificaciones de PropSync
          se enviarán desde <strong>${cfg.fromEmail}</strong>.
        </p>
        <p style="font-size:12px;color:#94a3b8;margin-top:24px;">Si no esperabas este correo, ignóralo.</p>
      </div>`,
    )
  } catch (err) {
    return NextResponse.json({ error: `Conexión OK, pero falló el envío: ${err instanceof Error ? err.message : String(err)}` }, { status: 400 })
  }

  // Mark as verified
  await (db.from('companies') as any)
    .update({ smtp_verified_at: new Date().toISOString() })
    .eq('id', companyId)

  return NextResponse.json({ ok: true, sentTo: sendTo })
}
