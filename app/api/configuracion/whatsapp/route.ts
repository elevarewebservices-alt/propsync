import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { encrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

/**
 * GET — Retorna la configuración WhatsApp actual de la empresa (sin el token desencriptado).
 */
export async function GET() {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('whatsapp_phone_number_id, whatsapp_business_account_id, whatsapp_webhook_token, whatsapp_access_token_enc')
    .eq('id', companyId)
    .single()

  const c = data as any
  return NextResponse.json({
    phoneNumberId: c?.whatsapp_phone_number_id ?? null,
    businessAccountId: c?.whatsapp_business_account_id ?? null,
    webhookToken: c?.whatsapp_webhook_token ?? null,
    hasAccessToken: !!c?.whatsapp_access_token_enc,
  })
}

/**
 * POST — Guarda la configuración WhatsApp.
 */
export async function POST(request: NextRequest) {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    phoneNumberId?: string
    businessAccountId?: string
    accessToken?: string
  }

  const db = createAdminClient()
  const update: Record<string, unknown> = {}

  if (body.phoneNumberId !== undefined) {
    update.whatsapp_phone_number_id = body.phoneNumberId.trim() || null
  }
  if (body.businessAccountId !== undefined) {
    update.whatsapp_business_account_id = body.businessAccountId.trim() || null
  }
  if (body.accessToken !== undefined && body.accessToken.trim()) {
    try {
      update.whatsapp_access_token_enc = encrypt(body.accessToken.trim())
    } catch {
      return NextResponse.json({ error: 'Error encriptando token' }, { status: 500 })
    }
  }

  await (db.from('companies') as any)
    .update(update)
    .eq('id', companyId)

  return NextResponse.json({ success: true })
}

/**
 * DELETE — Desconecta WhatsApp (limpia credenciales).
 */
export async function DELETE() {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  await (db.from('companies') as any)
    .update({
      whatsapp_phone_number_id: null,
      whatsapp_business_account_id: null,
      whatsapp_access_token_enc: null,
    })
    .eq('id', companyId)

  return NextResponse.json({ success: true })
}
