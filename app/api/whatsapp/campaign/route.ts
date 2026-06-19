import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { sendTemplate, normalizePhone } from '@/lib/whatsapp'
import { decrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

/**
 * GET — Devuelve el estado de la campaña activa más reciente y sus estadísticas.
 */
export async function GET() {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  const { data: campaign } = await db
    .from('whatsapp_campaigns')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!campaign) {
    return NextResponse.json({
      stats: {
        total: 0,
        enviados: 0,
        respondidos: 0,
        pendientes: 0,
        enProgreso: false,
        ultimaEjecucion: null,
      },
      campaign: null,
    })
  }

  const c = campaign as any
  return NextResponse.json({
    stats: {
      total: c.total,
      enviados: c.enviados,
      respondidos: c.respondidos,
      pendientes: c.pendientes,
      enProgreso: c.status === 'activa',
      ultimaEjecucion: c.started_at,
    },
    campaign,
  })
}

/**
 * POST — Inicia o detiene una campaña de verificación.
 * Body: { action: 'start' | 'stop', tipo?: string, templateName?: string }
 */
export async function POST(request: NextRequest) {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    action: 'start' | 'stop'
    tipo?: 'verificacion' | 'marketing' | 'seguimiento'
    templateName?: string
  }

  const db = createAdminClient()

  if (body.action === 'stop') {
    await (db.from('whatsapp_campaigns') as any)
      .update({ status: 'pausada' })
      .eq('company_id', companyId)
      .eq('status', 'activa')
    return NextResponse.json({ success: true })
  }

  // action === 'start'
  // Cargar credenciales WhatsApp
  const { data: company } = await (db.from('companies') as any)
    .select('whatsapp_phone_number_id, whatsapp_access_token_enc')
    .eq('id', companyId)
    .single()

  const phoneNumberId = (company as any)?.whatsapp_phone_number_id
  const tokenEnc = (company as any)?.whatsapp_access_token_enc

  if (!phoneNumberId || !tokenEnc) {
    return NextResponse.json(
      { error: 'WhatsApp no configurado. Ve a Configuración > WhatsApp.' },
      { status: 400 },
    )
  }

  // Obtener propiedades activas con teléfono de propietario
  const { data: properties } = await db
    .from('properties')
    .select('id, titulo, telefono_propietario')
    .eq('company_id', companyId)
    .eq('estado_publicacion', 'activo')
    .not('telefono_propietario', 'is', null)

  const validProperties = (properties ?? []).filter(
    (p: any) => p.telefono_propietario && p.telefono_propietario.trim().length > 0,
  )

  if (validProperties.length === 0) {
    return NextResponse.json(
      { error: 'No hay propiedades activas con teléfono de propietario.' },
      { status: 400 },
    )
  }

  // Crear nueva campaña
  const { data: newCampaign, error: createErr } = await (db.from('whatsapp_campaigns') as any)
    .insert({
      company_id: companyId,
      nombre: 'Verificación de disponibilidad',
      tipo: body.tipo ?? 'verificacion',
      status: 'activa',
      template_name: body.templateName ?? 'property_availability_check',
      total: validProperties.length,
      enviados: 0,
      respondidos: 0,
      pendientes: validProperties.length,
      fallidos: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (createErr || !newCampaign) {
    return NextResponse.json({ error: 'Error creando campaña' }, { status: 500 })
  }

  // Disparar el envío en background (no bloquea la respuesta)
  const campaignId = (newCampaign as any).id
  let accessToken: string
  try {
    accessToken = decrypt(tokenEnc)
  } catch {
    return NextResponse.json({ error: 'Error desencriptando credenciales' }, { status: 500 })
  }

  sendBulkCampaign(companyId, campaignId, validProperties, {
    phoneNumberId,
    accessToken,
    templateName: body.templateName ?? 'property_availability_check',
  }).catch(err => console.error('Error en campaña bulk:', err))

  return NextResponse.json({ success: true, campaign: newCampaign })
}

async function sendBulkCampaign(
  companyId: string,
  campaignId: string,
  properties: any[],
  config: { phoneNumberId: string; accessToken: string; templateName: string },
) {
  const db = createAdminClient()
  let enviados = 0
  let fallidos = 0

  for (const property of properties) {
    const phone = normalizePhone(property.telefono_propietario)
    if (!phone) continue

    const result = await sendTemplate(
      { phoneNumberId: config.phoneNumberId, accessToken: config.accessToken },
      phone,
      config.templateName,
      'es',
    )

    await (db.from('whatsapp_messages') as any).insert({
      company_id: companyId,
      campaign_id: campaignId,
      property_id: property.id,
      direction: 'outbound',
      wa_message_id: result.messageId ?? null,
      phone_number: phone,
      message_type: 'template',
      template_name: config.templateName,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error ?? null,
    })

    if (result.success) {
      enviados++
      // Marcar la propiedad como contactada
      await (db.from('properties') as any)
        .update({ whatsapp_estado: 'contactado' })
        .eq('id', property.id)
    } else {
      fallidos++
    }

    // Actualizar contadores de la campaña en tiempo real
    await (db.from('whatsapp_campaigns') as any)
      .update({
        enviados,
        fallidos,
        pendientes: Math.max(0, properties.length - enviados - fallidos),
      })
      .eq('id', campaignId)

    // Pequeña pausa para no saturar el rate limit de Meta (max 80 msg/seg)
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Marcar la campaña como completada
  await (db.from('whatsapp_campaigns') as any)
    .update({
      status: 'completada',
      completed_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
}
