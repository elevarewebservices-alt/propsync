// Encuentra24 leads → PropSync CRM, per company.
//
// Run every few minutes by /api/cron/portales (pinged from the Elevare droplet)
// and on demand from Configuración → Fuentes. Contact creation/dedupe/linking
// lives in lib/portal-lead-ingest.ts (shared with Compre o Alquile).

import { createAdminClient } from './supabase'
import { getCompanyAccess } from './subscription'
import { fetchEncuentra24Leads } from './encuentra24'
import { normalizeEncuentra24Lead, type PortalLead } from './portal-leads'
import { ingestPortalLeads } from './portal-lead-ingest'

export interface Encuentra24SyncResult {
  companyId: string
  status: 'ok' | 'skipped' | 'error'
  reason?: string
  fetched: number
  created: number
  merged: number      // matched an existing contact → note added instead
  duplicates: number  // already imported
  failed: number
}

export async function syncCompanyEncuentra24(companyId: string): Promise<Encuentra24SyncResult> {
  const result: Encuentra24SyncResult = { companyId, status: 'ok', fetched: 0, created: 0, merged: 0, duplicates: 0, failed: 0 }
  const db = createAdminClient()

  const { data: company } = await (db.from('companies') as any)
    .select('id, encuentra24_api_key, encuentra24_slug, encuentra24_last_lead_at, encuentra24_leads_imported')
    .eq('id', companyId)
    .maybeSingle()
  if (!company?.encuentra24_api_key || !company?.encuentra24_slug) {
    return { ...result, status: 'skipped', reason: 'Sin credenciales de Encuentra24' }
  }
  if ((await getCompanyAccess(companyId)).blocked) {
    return { ...result, status: 'skipped', reason: 'Suscripción inactiva' }
  }

  const watermark = Number(company.encuentra24_last_lead_at) || 0
  let leads: PortalLead[]
  try {
    const raw = await fetchEncuentra24Leads({ apiKey: company.encuentra24_api_key, slug: company.encuentra24_slug })
    leads = raw.map(normalizeEncuentra24Lead)
      .filter((l) => l.externalId && l.createdAt > watermark)
      .sort((a, b) => a.createdAt - b.createdAt)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await (db.from('companies') as any)
      .update({ encuentra24_last_sync_at: new Date().toISOString(), encuentra24_last_error: msg.slice(0, 500) })
      .eq('id', companyId)
    return { ...result, status: 'error', reason: msg }
  }
  result.fetched = leads.length

  const ingest = await ingestPortalLeads(companyId, 'encuentra24', leads)
  Object.assign(result, ingest)

  // Every lead failing points to something systemic (schema, permissions):
  // keep the watermark so the whole batch is retried on the next run.
  const allFailed = leads.length > 0 && ingest.failed === leads.length
  const maxCreatedAt = leads.reduce((m, l) => Math.max(m, l.createdAt), watermark)
  await (db.from('companies') as any)
    .update({
      encuentra24_last_sync_at: new Date().toISOString(),
      encuentra24_last_error: allFailed ? 'No se pudo importar ningún lead; se reintentará.' : null,
      ...(allFailed ? {} : { encuentra24_last_lead_at: maxCreatedAt }),
      encuentra24_leads_imported: (Number(company.encuentra24_leads_imported) || 0) + ingest.created,
    })
    .eq('id', companyId)
  if (allFailed) result.status = 'error'
  return result
}

/** Every company with Encuentra24 credentials, sequentially. */
export async function syncAllEncuentra24(): Promise<Encuentra24SyncResult[]> {
  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('id')
    .not('encuentra24_api_key', 'is', null)
    .not('encuentra24_slug', 'is', null)
  const results: Encuentra24SyncResult[] = []
  for (const c of (data ?? []) as { id: string }[]) {
    try {
      results.push(await syncCompanyEncuentra24(c.id))
    } catch (err) {
      results.push({ companyId: c.id, status: 'error', reason: err instanceof Error ? err.message : String(err), fetched: 0, created: 0, merged: 0, duplicates: 0, failed: 0 })
    }
  }
  return results
}
