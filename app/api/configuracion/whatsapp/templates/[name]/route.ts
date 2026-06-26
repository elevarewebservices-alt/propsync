import { NextResponse } from 'next/server'
import { resolveCompanyId, getSessionPermissions, getSessionPlan } from '@/lib/auth'
import { hasAddon } from '@/lib/addons'
import { createAdminClient } from '@/lib/supabase'
import { decrypt } from '@/lib/crypto'
import { deleteTemplate } from '@/lib/whatsapp-templates'

export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, { params }: { params: { name: string } }) {
  const companyId = await resolveCompanyId()
  if (!(await getSessionPermissions()).accessSettings) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const plan = await getSessionPlan()
  if (plan !== 'pro' || !(await hasAddon(companyId, 'marketing'))) {
    return NextResponse.json({ error: 'Esto requiere el add-on Marketing (Pro)' }, { status: 403 })
  }

  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('whatsapp_business_account_id, whatsapp_access_token_enc')
    .eq('id', companyId)
    .single()

  const businessAccountId = data?.whatsapp_business_account_id as string | null
  const tokenEnc = data?.whatsapp_access_token_enc as string | null
  if (!businessAccountId || !tokenEnc) {
    return NextResponse.json({ error: 'WhatsApp no está configurado para esta empresa' }, { status: 400 })
  }

  const result = await deleteTemplate(
    { businessAccountId, accessToken: decrypt(tokenEnc) },
    decodeURIComponent(params.name),
  )
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({ success: true })
}
