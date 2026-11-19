import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId, getSessionPermissions } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { isNaventConfigured, getInmobiliariasVinculadas } from '@/lib/navent'
import { syncCompanyCompreOAlquile, unpublishAllCompreOAlquile, defaultCompreOAlquileCodigo } from '@/lib/comprealquile-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function gate(): Promise<string | NextResponse> {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!(await getSessionPermissions()).accessSettings) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  return companyId
}

/** GET — integration status for the agency. */
export async function GET() {
  const companyId = await gate()
  if (companyId instanceof NextResponse) return companyId
  const db = createAdminClient()
  const { data, error } = await (db.from('companies') as any)
    .select('comprealquile_enabled, comprealquile_codigo, comprealquile_last_sync_at, comprealquile_last_error, comprealquile_leads_imported')
    .eq('id', companyId)
    .single()
  if (error) return NextResponse.json({ error: 'Falta aplicar la migración 033.' }, { status: 500 })

  const { data: rows } = await (db.from('portal_listings') as any)
    .select('status').eq('company_id', companyId).eq('portal', 'comprealquile')
  const counts = { online: 0, error: 0, pending: 0 }
  for (const r of (rows ?? []) as { status: string }[]) if (r.status in counts) counts[r.status as keyof typeof counts]++

  // Whether Compre o Alquile has linked this agency's code to the PropSync integration.
  let vinculada: boolean | null = null
  if (isNaventConfigured() && data?.comprealquile_codigo) {
    try {
      vinculada = (await getInmobiliariasVinculadas()).some((i) => i.codigoInmobiliaria === data.comprealquile_codigo && !i.bloqueada)
    } catch { vinculada = null }
  }

  return NextResponse.json({
    platform_ready: isNaventConfigured(),
    enabled: Boolean(data?.comprealquile_enabled),
    codigo: data?.comprealquile_codigo ?? defaultCompreOAlquileCodigo(companyId),
    vinculada,
    last_sync_at: data?.comprealquile_last_sync_at ?? null,
    last_error: data?.comprealquile_last_error ?? null,
    leads_imported: data?.comprealquile_leads_imported ?? 0,
    listings: counts,
  })
}

/** POST ?action=activate | deactivate | sync */
export async function POST(req: NextRequest) {
  const companyId = await gate()
  if (companyId instanceof NextResponse) return companyId
  const action = req.nextUrl.searchParams.get('action')
  const db = createAdminClient()

  if (action === 'activate') {
    const { data } = await (db.from('companies') as any).select('comprealquile_codigo').eq('id', companyId).single()
    const { error } = await (db.from('companies') as any)
      .update({ comprealquile_enabled: true, comprealquile_codigo: data?.comprealquile_codigo ?? defaultCompreOAlquileCodigo(companyId), comprealquile_last_error: null })
      .eq('id', companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'deactivate') {
    const offline = await unpublishAllCompreOAlquile(companyId).catch(() => 0)
    await (db.from('companies') as any).update({ comprealquile_enabled: false }).eq('id', companyId)
    return NextResponse.json({ ok: true, offline })
  }

  if (action === 'sync') {
    const result = await syncCompanyCompreOAlquile(companyId)
    return NextResponse.json(result, { status: result.status === 'error' ? 502 : 200 })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
