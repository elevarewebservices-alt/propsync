import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { syncCompanyEncuentra24 } from '@/lib/encuentra24-sync'
import { createAdminClient } from '@/lib/supabase'
import { adminOr403, isIsoDate, PLAN_IDS, SUBSCRIPTION_STATUSES, UUID_RE } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/companies/[id] — Elevare-only edit of a tenant's plan and
 * subscription state (change plan, extend trial, suspend, reactivate).
 * Body: any of { plan_id, subscription_status, trial_ends_at, current_period_end,
 * generate_feed_token: true, encuentra24_slug, encuentra24_api_key,
 * sync_encuentra24: true } — feed URLs, Encuentra24 lead credentials, and an
 * immediate Encuentra24 import for manually-managed clients.
 * subscription_status / dates accept null (null status = grandfathered/open).
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  if ('plan_id' in body) {
    if (!(PLAN_IDS as readonly string[]).includes(body.plan_id)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }
    update.plan_id = body.plan_id
  }
  if ('subscription_status' in body) {
    const s = body.subscription_status
    if (s !== null && !(SUBSCRIPTION_STATUSES as readonly string[]).includes(s)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    update.subscription_status = s
  }
  for (const key of ['trial_ends_at', 'current_period_end'] as const) {
    if (key in body) {
      if (body[key] !== null && !isIsoDate(body[key])) {
        return NextResponse.json({ error: `Fecha inválida: ${key}` }, { status: 400 })
      }
      update[key] = body[key]
    }
  }
  if (body.generate_feed_token === true) update.feed_token = randomUUID()
  if (typeof body.encuentra24_slug === 'string') {
    const slug = body.encuentra24_slug.trim()
    if (slug && !/^[a-z0-9][a-z0-9-]{1,80}$/i.test(slug)) {
      return NextResponse.json({ error: 'Slug de Encuentra24 inválido' }, { status: 400 })
    }
    update.encuentra24_slug = slug || null
    if (!slug) update.encuentra24_api_key = null
  }
  if (typeof body.encuentra24_api_key === 'string' && body.encuentra24_api_key.trim()) {
    update.encuentra24_api_key = body.encuentra24_api_key.trim()
    update.encuentra24_last_error = null
  }

  if (body.sync_encuentra24 === true && Object.keys(update).length === 0) {
    const result = await syncCompanyEncuentra24(params.id)
    console.info('[admin] encuentra24 sync', { by: admin, company: params.id, result })
    if (result.status === 'error') return NextResponse.json({ error: result.reason ?? 'Error de sincronización' }, { status: 502 })
    return NextResponse.json({ sync: result })
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await (db.from('companies') as any)
    .update(update)
    .eq('id', params.id)
    .select('id, plan_id, subscription_status, trial_ends_at, current_period_end, subscription_provider')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.info('[admin] company updated', { by: admin, company: params.id, update })
  return NextResponse.json({ company: data })
}
