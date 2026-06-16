import nodemailer, { Transporter } from 'nodemailer'
import { resolveSmtpConfig, SmtpConfig } from './email-config'

function h(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Transport ────────────────────────────────────────────────────────────────

function makeTransport(cfg: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host:   cfg.host,
    port:   cfg.port,
    secure: cfg.secure,
    auth:   { user: cfg.user, pass: cfg.password },
  })
}

export async function sendTransactionalEmail({
  to,
  toName,
  subject,
  htmlContent,
  companyId,
}: {
  to: string
  toName: string
  subject: string
  htmlContent: string
  companyId?: string | null
}): Promise<void> {
  const cfg = await resolveSmtpConfig(companyId)
  if (!cfg) {
    console.warn('[email] No SMTP config available — skipping email')
    return
  }

  try {
    const transport = makeTransport(cfg)
    await transport.sendMail({
      from:    `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to:      `"${toName}" <${to}>`,
      subject,
      html:    htmlContent,
    })
  } catch (err) {
    console.error('[email] send failed:', err)
  }
}

// Lightweight verify used by the "test connection" endpoint
export async function verifySmtpConfig(cfg: SmtpConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const transport = makeTransport(cfg)
    await transport.verify()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendRawEmail(cfg: SmtpConfig, to: string, subject: string, html: string): Promise<void> {
  const transport = makeTransport(cfg)
  await transport.sendMail({
    from:    `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to,
    subject,
    html,
  })
}

// ─── HTML shell ──────────────────────────────────────────────────────────────

function emailShell({
  accent,
  headerTitle,
  headerSub,
  body,
  recipientEmail,
}: {
  accent: string
  headerTitle: string
  headerSub: string
  body: string
  recipientEmail: string
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.propsync.app'
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${h(headerTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:40px 16px;">
    <tr><td align="center">
      <table width="568" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">

        <!-- Header band -->
        <tr><td style="background:${accent};padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:26px 36px 22px;">
                <p style="margin:0;font-size:18px;font-weight:700;color:#fff;letter-spacing:-.2px;">PropSync</p>
                <p style="margin:3px 0 0;font-size:11px;font-weight:500;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.07em;">Base de datos · CRM · IA</p>
              </td>
              <td style="padding:26px 36px 22px;" align="right">
                <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,.9);">${h(headerTitle)}</p>
                <p style="margin:2px 0 0;font-size:11px;color:rgba(255,255,255,.55);">${h(headerSub)}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 36px 28px;">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:18px 36px 22px;background:#f8fafc;border-top:1px solid #e8ecf2;">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.9;">
            Enviado a <a href="mailto:${h(recipientEmail)}" style="color:#6b7280;text-decoration:none;">${h(recipientEmail)}</a>
            &nbsp;·&nbsp; <a href="${appUrl}" style="color:#6b7280;text-decoration:none;">PropSync</a>
            <br>Creado por <a href="https://elevarewebservices.com" style="color:#1a73e8;text-decoration:none;">Elevare</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:38%;">${h(label)}</td>
    <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:13px;font-weight:500;">${h(value)}</td>
  </tr>`
}

function pill(label: string, bg: string, color: string): string {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;letter-spacing:.03em;">${h(label)}</span>`
}

function cta(text: string, url: string, accent: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td style="border-radius:8px;background:${accent};">
      <a href="${url}" style="display:inline-block;padding:13px 26px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:-.1px;">${h(text)} →</a>
    </td></tr>
  </table>`
}

const FUENTE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  meta_leads: { label: 'Meta Leads', bg: '#dbeafe', color: '#1d4ed8' },
  web_form:   { label: 'Web Form',   bg: '#dcfce7', color: '#15803d' },
  referido:   { label: 'Referido',   bg: '#ede9fe', color: '#6d28d9' },
  manual:     { label: 'Manual',     bg: '#f1f5f9', color: '#475569' },
  wasi:       { label: 'Wasi',       bg: '#e0f2fe', color: '#0369a1' },
}

const TIPO_LABEL: Record<string, string> = {
  cliente:    'Cliente',
  propietario: 'Propietario',
  broker:     'Broker',
}

// ─── Transactional email functions ───────────────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  nombre: string,
  agencia: string,
  companyId?: string | null,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.propsync.app'
  const accent = '#1a73e8'

  const body = `
    <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-.4px;">¡Bienvenido, ${h(nombre)}!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.65;">
      Tu cuenta para <strong style="color:#1e293b;">${h(agencia)}</strong> está lista.
      Gestiona tu inventario, captura leads y publica propiedades — todo desde un solo lugar.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;margin-bottom:8px;">
      <tr><td style="padding:20px 22px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em;">Primeros pasos</p>
        <table cellpadding="0" cellspacing="0">
          ${[
            'Agrega tu inventario de propiedades o conecta Wasi',
            'Configura tu pipeline CRM y agrega leads',
            'Invita a tu equipo desde Configuración → Usuarios',
          ].map((text) => `
          <tr>
            <td style="padding:5px 0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:20px;vertical-align:top;padding-top:1px;">
                  <div style="width:6px;height:6px;border-radius:50%;background:${accent};margin-top:5px;"></div>
                </td>
                <td style="font-size:14px;color:#374151;line-height:1.5;">${h(text)}</td>
              </tr></table>
            </td>
          </tr>`).join('')}
        </table>
      </td></tr>
    </table>

    ${cta('Ir al Dashboard', `${appUrl}/dashboard`, accent)}`

  await sendTransactionalEmail({
    to: email,
    toName: nombre,
    subject: `¡Bienvenido a PropSync, ${nombre}!`,
    htmlContent: emailShell({
      accent,
      headerTitle: 'Cuenta creada',
      headerSub: agencia,
      body,
      recipientEmail: email,
    }),
    companyId,
  })
}

export async function sendAgentWelcomeEmail(
  email: string,
  nombre: string,
  agencia: string,
  companyId?: string | null,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.propsync.app'
  const accent = '#1a73e8'

  const body = `
    <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-.4px;">¡Hola, ${h(nombre)}!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.65;">
      Fuiste invitado a unirte a <strong style="color:#1e293b;">${h(agencia)}</strong> en PropSync.
      Tu cuenta ya está activa — solo inicia sesión para comenzar.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;margin-bottom:8px;">
      <tr><td style="padding:20px 22px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em;">Qué puedes hacer</p>
        <table cellpadding="0" cellspacing="0">
          ${[
            'Ver y gestionar el inventario de propiedades',
            'Trabajar con leads asignados en el CRM',
            'Registrar notas y seguimientos de tus clientes',
          ].map((text) => `
          <tr>
            <td style="padding:5px 0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:20px;vertical-align:top;padding-top:1px;">
                  <div style="width:6px;height:6px;border-radius:50%;background:${accent};margin-top:5px;"></div>
                </td>
                <td style="font-size:14px;color:#374151;line-height:1.5;">${h(text)}</td>
              </tr></table>
            </td>
          </tr>`).join('')}
        </table>
      </td></tr>
    </table>

    ${cta('Ir al Dashboard', `${appUrl}/dashboard`, accent)}`

  await sendTransactionalEmail({
    to: email,
    toName: nombre,
    subject: `Fuiste invitado a ${agencia} en PropSync`,
    htmlContent: emailShell({
      accent,
      headerTitle: 'Invitación aceptada',
      headerSub: agencia,
      body,
      recipientEmail: email,
    }),
    companyId,
  })
}

export interface NewLeadInput {
  nombre: string
  fuente: string
  tipo: string
  telefono: string | null
  email: string | null
  ciudad: string | null
  zona_interes: string | null
}

export async function sendNewLeadNotification(
  agentEmail: string,
  agentNombre: string,
  lead: NewLeadInput,
  companyId?: string | null,
): Promise<void> {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.propsync.app'
  const accent  = '#7c3aed'
  const fuente  = FUENTE_CONFIG[lead.fuente] ?? FUENTE_CONFIG.manual
  const tipoPill = pill(TIPO_LABEL[lead.tipo] ?? lead.tipo, '#f1f5f9', '#374151')
  const fuentePill = pill(fuente.label, fuente.bg, fuente.color)

  const rows = [
    lead.telefono && infoRow('Teléfono', lead.telefono),
    lead.email    && infoRow('Email', lead.email),
    lead.ciudad   && infoRow('Ciudad', lead.ciudad),
    lead.zona_interes && infoRow('Zona de interés', lead.zona_interes),
  ].filter(Boolean).join('')

  const body = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:.05em;">Nuevo lead asignado</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-.3px;">${h(lead.nombre)}</h1>
    <p style="margin:0 0 20px;">${tipoPill} &nbsp; ${fuentePill}</p>

    ${rows ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${rows}</table>` : ''}

    ${cta('Ver en CRM', `${appUrl}/crm`, accent)}`

  await sendTransactionalEmail({
    to: agentEmail,
    toName: agentNombre,
    subject: `Nuevo lead: ${lead.nombre} — PropSync`,
    htmlContent: emailShell({
      accent,
      headerTitle: 'Lead asignado',
      headerSub: `Fuente: ${fuente.label}`,
      body,
      recipientEmail: agentEmail,
    }),
    companyId,
  })
}

export async function sendStageMilestoneEmail(
  agentEmail: string,
  agentNombre: string,
  contactNombre: string,
  stageName: string,
  stageColor: string,
  isTerminal: boolean,
  companyId?: string | null,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.propsync.app'
  const accent = stageColor ?? '#22c55e'
  const isClosed = stageName.toLowerCase().includes('cerrado')

  const headline = isClosed
    ? `¡El lead fue cerrado exitosamente!`
    : `El lead fue movido a "${stageName}"`

  const body = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:${accent};">
      ${isTerminal ? 'Etapa terminal' : 'Cambio de etapa'}
    </p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-.3px;">${h(headline)}</h1>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;margin-bottom:8px;">
      <tr><td style="padding:20px 22px;">
        ${infoRow('Contacto', contactNombre)}
        ${infoRow('Nueva etapa', stageName)}
      </td></tr>
    </table>

    ${isClosed ? `<p style="margin:16px 0 0;font-size:14px;color:#475569;">¡Buen trabajo, ${h(agentNombre)}! Recuerda actualizar los detalles del cierre en el CRM.</p>` : ''}

    ${cta('Ver en CRM', `${appUrl}/crm`, accent)}`

  await sendTransactionalEmail({
    to: agentEmail,
    toName: agentNombre,
    subject: isClosed
      ? `¡Cierre exitoso! ${contactNombre} — PropSync`
      : `Lead actualizado: ${contactNombre} → ${stageName} — PropSync`,
    htmlContent: emailShell({
      accent,
      headerTitle: stageName,
      headerSub: h(contactNombre),
      body,
      recipientEmail: agentEmail,
    }),
    companyId,
  })
}

export interface ReminderContact {
  nombre: string
  fecha_seguimiento: string
  etapa_crm: string
}

export async function sendFollowUpReminderEmail(
  agentEmail: string,
  agentNombre: string,
  contacts: ReminderContact[],
  companyId?: string | null,
): Promise<void> {
  if (contacts.length === 0) return

  const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.propsync.app'
  const accent       = '#f59e0b'
  const today        = new Date().toISOString().split('T')[0]
  const count        = contacts.length
  const overdueCount = contacts.filter(c => c.fecha_seguimiento < today).length
  const todayCount   = contacts.filter(c => c.fecha_seguimiento === today).length

  const statusLine = [
    overdueCount > 0 ? `<span style="color:#ef4444;font-weight:700;">${overdueCount} vencido${overdueCount !== 1 ? 's' : ''}</span>` : '',
    todayCount   > 0 ? `<span style="color:#f59e0b;font-weight:700;">${todayCount} para hoy</span>` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')

  const rows = contacts.slice(0, 10).map(c => {
    const overdue   = c.fecha_seguimiento < today
    const dateLabel = overdue ? `Vencido (${c.fecha_seguimiento})` : 'Hoy'
    const dateColor = overdue ? '#ef4444' : '#f59e0b'
    return `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;">${h(c.nombre)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:${dateColor};">${dateLabel}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">${h(c.etapa_crm)}</td>
    </tr>`
  }).join('')

  const body = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f59e0b;text-transform:uppercase;letter-spacing:.05em;">Recordatorio</p>
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-.3px;">
      Tienes ${count} seguimiento${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}
    </h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">${statusLine}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:8px;">
      <thead>
        <tr style="background:#fffbeb;">
          <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em;">Contacto</th>
          <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em;">Fecha</th>
          <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em;">Etapa</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${count > 10 ? `<p style="margin:10px 0 0;font-size:13px;color:#64748b;">+ ${count - 10} más en el CRM</p>` : ''}

    ${cta('Ver en CRM', `${appUrl}/crm`, accent)}`

  await sendTransactionalEmail({
    to: agentEmail,
    toName: agentNombre,
    subject: `Tienes ${count} seguimiento${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''} — PropSync`,
    htmlContent: emailShell({
      accent,
      headerTitle: 'Seguimientos pendientes',
      headerSub: new Date().toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' }),
      body,
      recipientEmail: agentEmail,
    }),
    companyId,
  })
}
