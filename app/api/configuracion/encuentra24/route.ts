import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId, getSessionPermissions } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { fetchEncuentra24Leads } from '@/lib/encuentra24'
import { syncCompanyEncuentra24 } from '@/lib/encuentra24-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,80}$/i

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

/** GET — connection status. Never returns the API key. */
export async function GET() {
  try {
    const companyId = await gate()
    if (companyId instanceof NextResponse) return companyId
    const db = createAdminClient()
    const { data, error } = await (db.from('companies') as any)
      .select('encuentra24_slug, encuentra24_api_key, encuentra24_last_sync_at, encuentra24_last_error, encuentra24_leads_imported')
      .eq('id', companyId)
      .single()
    if (error) return NextResponse.json({ error: 'Falta aplicar la migración 032.' }, { status: 500 })
    return NextResponse.json({
      slug: data?.encuentra24_slug ?? '',
      key_set: Boolean(data?.encuentra24_api_key),
      connected: Boolean(data?.encuentra24_slug && data?.encuentra24_api_key),
      last_sync_at: data?.encuentra24_last_sync_at ?? null,
      last_error: data?.encuentra24_last_error ?? null,
      leads_imported: data?.encuentra24_leads_imported ?? 0,
    })
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar Encuentra24' }, { status: 500 })
  }
}

/** PATCH { slug?, api_key? } — save credentials. An empty slug disconnects. */
export async function PATCH(req: NextRequest) {
  try {
    const companyId = await gate()
    if (companyId instanceof NextResponse) return companyId
    const body = await req.json().catch(() => ({})) as { slug?: string; api_key?: string }
    const update: Record<string, string | null | number> = {}

    if (typeof body.slug === 'string') {
      const slug = body.slug.trim()
      if (slug && !SLUG_RE.test(slug)) return NextResponse.json({ error: 'Slug inválido (ej. mi-inmobiliaria)' }, { status: 400 })
      update.encuentra24_slug = slug || null
      if (!slug) update.encuentra24_api_key = null
    }
    if (typeof body.api_key === 'string' && body.api_key.trim()) {
      update.encuentra24_api_key = body.api_key.trim()
      update.encuentra24_last_error = null
    }
    if (Object.keys(update).length === 0) return NextResponse.json({ ok: true })

    const db = createAdminClient()
    const { error } = await (db.from('companies') as any).update(update).eq('id', companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }
}

/** POST ?action=test (one fetch, no writes) | ?action=sync (import now). */
export async function POST(req: NextRequest) {
  try {
    const companyId = await gate()
    if (companyId instanceof NextResponse) return companyId
    const action = req.nextUrl.searchParams.get('action')

    if (action === 'test') {
      const db = createAdminClient()
      const { data } = await (db.from('companies') as any)
        .select('encuentra24_slug, encuentra24_api_key').eq('id', companyId).single()
      if (!data?.encuentra24_slug || !data?.encuentra24_api_key) {
        return NextResponse.json({ ok: false, error: 'Guarda primero el slug y la API key.' }, { status: 400 })
      }
      try {
        const leads = await fetchEncuentra24Leads({ apiKey: data.encuentra24_api_key, slug: data.encuentra24_slug, limit: 5 })
        return NextResponse.json({ ok: true, sample: leads.length })
      } catch (err) {
        return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Error de conexión' }, { status: 502 })
      }
    }

    if (action === 'sync') {
      const result = await syncCompanyEncuentra24(companyId)
      return NextResponse.json(result, { status: result.status === 'error' ? 502 : 200 })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'No se pudo completar la acción' }, { status: 500 })
  }
}
