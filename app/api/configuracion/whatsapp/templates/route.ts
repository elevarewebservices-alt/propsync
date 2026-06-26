import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId, getSessionPermissions, getSessionPlan } from '@/lib/auth'
import { hasAddon } from '@/lib/addons'
import { createAdminClient } from '@/lib/supabase'
import { decrypt } from '@/lib/crypto'
import { listTemplates, createTemplate, type CreateTemplateInput } from '@/lib/whatsapp-templates'

export const dynamic = 'force-dynamic'

async function authorize() {
  const companyId = await resolveCompanyId()
  if (!(await getSessionPermissions()).accessSettings) {
    return { error: NextResponse.json({ error: 'Sin permisos' }, { status: 403 }) }
  }
  const plan = await getSessionPlan()
  if (plan !== 'pro' || !(await hasAddon(companyId, 'marketing'))) {
    return { error: NextResponse.json({ error: 'Esto requiere el add-on Marketing (Pro)' }, { status: 403 }) }
  }
  return { companyId }
}

async function getConfig(companyId: string) {
  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('whatsapp_business_account_id, whatsapp_access_token_enc')
    .eq('id', companyId)
    .single()

  const businessAccountId = data?.whatsapp_business_account_id as string | null
  const tokenEnc = data?.whatsapp_access_token_enc as string | null
  if (!businessAccountId || !tokenEnc) return null

  return { businessAccountId, accessToken: decrypt(tokenEnc) }
}

export async function GET() {
  const auth = await authorize()
  if ('error' in auth) return auth.error

  const config = await getConfig(auth.companyId)
  if (!config) {
    return NextResponse.json({ error: 'WhatsApp no está configurado para esta empresa' }, { status: 400 })
  }

  const result = await listTemplates(config)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({ templates: result.data })
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error

  const config = await getConfig(auth.companyId)
  if (!config) {
    return NextResponse.json({ error: 'WhatsApp no está configurado para esta empresa' }, { status: 400 })
  }

  const body = await request.json() as CreateTemplateInput
  if (!body?.name || !body?.category || !body?.language || !body?.components?.length) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const result = await createTemplate(config, body)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({ template: result.data })
}
