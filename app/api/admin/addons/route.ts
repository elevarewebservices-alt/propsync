import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { adminOr403, UUID_RE } from '@/lib/admin'
import { ADDONS } from '@/lib/addons'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/addons — turn an add-on on/off for a company.
 * Body: { companyId, addonId, activo }. company_addons has no client write
 * policy (migration 023), so this server route is the only way to change it.
 */
export async function POST(request: NextRequest) {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin

  const body = await request.json().catch(() => ({}))
  const companyId = String(body.companyId ?? '')
  const addonId = String(body.addonId ?? '')
  if (!UUID_RE.test(companyId)) return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
  if (!ADDONS.some((a) => a.id === addonId)) return NextResponse.json({ error: 'Add-on inválido' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await (db.from('company_addons') as any)
    .upsert({ company_id: companyId, addon_id: addonId, activo: Boolean(body.activo) }, { onConflict: 'company_id,addon_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.info('[admin] addon toggled', { by: admin, company: companyId, addonId, activo: Boolean(body.activo) })
  return NextResponse.json({ ok: true })
}
