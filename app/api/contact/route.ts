import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { isValidEmail } from '@/lib/validation'

function h(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const TYPE_LABELS: Record<string, string> = {
  soporte: 'Soporte técnico',
  ventas:  'Consulta de ventas',
  otro:    'Otra consulta',
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    name?: string
    email?: string
    type?: string
    message?: string
  }

  const { name = '', email = '', type = 'otro', message = '' } = body

  if (!name.trim() || !email.trim() || !message.trim()) {
    return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Email no válido.' }, { status: 400 })
  }

  const host      = process.env.SMTP_HOST
  const port      = parseInt(process.env.SMTP_PORT ?? '587')
  const secure    = process.env.SMTP_SECURE === 'true'
  const user      = process.env.SMTP_USER
  const password  = process.env.SMTP_PASSWORD
  const fromEmail = process.env.SMTP_FROM_EMAIL || user || ''
  const fromName  = process.env.SMTP_FROM_NAME  || 'PropSync'

  if (!host || !user || !password) {
    console.error('[contact] Platform SMTP not configured')
    return NextResponse.json({
      error: 'El servicio de mensajería no está configurado. Escríbenos directamente a gerencia@elevarewebservices.com',
    }, { status: 503 })
  }

  const transport = nodemailer.createTransport({ host, port, secure, auth: { user, pass: password } })

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;">
      <h2 style="color:#1a73e8;margin:0 0 20px;font-size:20px;">Nuevo mensaje desde PropSync</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <tr>
          <td style="padding:8px 12px 8px 0;color:#6b7280;width:120px;vertical-align:top;">Nombre</td>
          <td style="padding:8px 0;color:#111827;font-weight:500;">${h(name)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px 8px 0;color:#6b7280;vertical-align:top;">Email</td>
          <td style="padding:8px 0;color:#111827;"><a href="mailto:${h(email)}" style="color:#1a73e8;">${h(email)}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 12px 8px 0;color:#6b7280;vertical-align:top;">Tipo</td>
          <td style="padding:8px 0;color:#111827;">${TYPE_LABELS[type] ?? h(type)}</td>
        </tr>
      </table>
      <div style="padding:18px;background:#f8fafc;border-radius:10px;border-left:4px solid #1a73e8;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${h(message)}</p>
      </div>
      <p style="margin-top:28px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
        Enviado desde el formulario de contacto de PropSync · ${new Date().toLocaleString('es-PA', { timeZone: 'America/Panama' })}
      </p>
    </div>
  `

  try {
    await transport.sendMail({
      from:    `"${fromName}" <${fromEmail}>`,
      to:      'gerencia@elevarewebservices.com',
      replyTo: `"${h(name)}" <${h(email)}>`,
      subject: `[PropSync] ${TYPE_LABELS[type] ?? 'Consulta'} — ${h(name)}`,
      html,
    })
  } catch (err) {
    console.error('[contact] Send failed:', err)
    return NextResponse.json({
      error: 'No se pudo enviar el mensaje. Por favor escríbenos directamente a gerencia@elevarewebservices.com',
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
