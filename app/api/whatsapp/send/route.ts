import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { sendTextMessage, sendTemplate, normalizePhone } from '@/lib/whatsapp'
import { decrypt } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    to: string
    contactId?: string
    propertyId?: string
    type: 'text' | 'template'
    text?: string
    templateName?: string
    languageCode?: string
  }

  if (!body.to || !body.type) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const db = createAdminClient()

  // Cargar credenciales WhatsApp de la empresa
  const { data: company } = await (db.from('companies') as any)
    .select('whatsapp_phone_number_id, whatsapp_access_token_enc')
    .eq('id', companyId)
    .single()

  const phoneNumberId = (company as any)?.whatsapp_phone_number_id
  const tokenEnc = (company as any)?.whatsapp_access_token_enc

  if (!phoneNumberId || !tokenEnc) {
    return NextResponse.json(
      { error: 'WhatsApp no configurado. Configura tus credenciales en Configuración.' },
      { status: 400 },
    )
  }

  let accessToken: string
  try {
    accessToken = decrypt(tokenEnc)
  } catch {
    return NextResponse.json({ error: 'Error desencriptando token' }, { status: 500 })
  }

  const config = { phoneNumberId, accessToken }
  const toPhone = normalizePhone(body.to)

  let result
  if (body.type === 'text') {
    if (!body.text) {
      return NextResponse.json({ error: 'Falta el texto del mensaje' }, { status: 400 })
    }
    result = await sendTextMessage(config, toPhone, body.text)
  } else {
    if (!body.templateName) {
      return NextResponse.json({ error: 'Falta el nombre del template' }, { status: 400 })
    }
    result = await sendTemplate(config, toPhone, body.templateName, body.languageCode ?? 'es')
  }

  // Guardar el mensaje en la base
  await (db.from('whatsapp_messages') as any).insert({
    company_id: companyId,
    contact_id: body.contactId ?? null,
    property_id: body.propertyId ?? null,
    direction: 'outbound',
    wa_message_id: result.messageId ?? null,
    phone_number: toPhone,
    message_type: body.type,
    body: body.text ?? null,
    template_name: body.templateName ?? null,
    status: result.success ? 'sent' : 'failed',
    error_message: result.error ?? null,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Error enviando mensaje' }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: result.messageId })
}
