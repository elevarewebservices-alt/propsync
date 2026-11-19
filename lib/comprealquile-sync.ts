// Compre o Alquile (OpenNavent RELA API) — two-way sync per company:
//   1. Listings: publish/update every property marked for Compre o Alquile
//      (activo/destacado + disponible + canal 'comprealquile'); take offline the
//      ones that no longer qualify. Unchanged listings aren't re-sent
//      (payload hash in portal_listings).
//   2. Contacts: GET /v2/inmobiliarias/{codigo}/mensajes → CRM contacts with
//      fuente 'comprealquile', linked to the exact listing (codigoAviso = our
//      property id). Shared rules in lib/portal-lead-ingest.ts.
//
// Run by /api/cron/portales every few minutes and from Configuración → Fuentes.

import { createAdminClient } from './supabase'
import { getCompanyAccess } from './subscription'
import {
  navent, isNaventConfigured, getOperaciones, getTipos, getCaracteristicas, getUbicacionesPorCoordenadas, NaventError,
} from './navent'
import {
  buildNaventAviso, pickOperaciones, pickTipo, pickCaracteristicas, pickUbicacion, payloadHash, parseNaventDate,
  naventDay, num, type NaventProperty, type CaracteristicaIds,
} from './navent-mapping'
import { cleanPhone, detectCountry, detectPropertyType, type PortalLead } from './portal-leads'
import { ingestPortalLeads } from './portal-lead-ingest'

export interface CompreOAlquileSyncResult {
  companyId: string
  status: 'ok' | 'skipped' | 'error'
  reason?: string
  published: number
  unchanged: number
  offline: number
  listingErrors: number
  leadsFetched: number
  created: number
  merged: number
  duplicates: number
  failed: number
}

const PORTAL = 'comprealquile'
const MAX_PUTS_PER_RUN = 20      // keep each run well inside the function time limit
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PROPERTY_COLUMNS = [
  'id', 'reference', 'titulo', 'descripcion', 'tipo', 'property_type_label', 'precio', 'iso_currency',
  'sale_price', 'rent_price', 'address', 'zona', 'ciudad', 'region_label', 'latitude', 'longitude',
  'bedrooms', 'bathrooms', 'half_bathrooms', 'garages', 'area', 'built_area', 'main_image_url', 'gallery_urls',
  'agente_asignado_id', 'updated_at',
].join(', ')

interface ListingRow { property_id: string; status: string; payload_hash: string | null; external_id: string | null }
interface AvisoResponse {
  idAviso?: number; estado?: string
  errors?: { messageText?: string; messageCode?: string }[]
  warnings?: { messageText?: string; messageCode?: string }[]
}

const empty = (companyId: string): CompreOAlquileSyncResult => ({
  companyId, status: 'ok', published: 0, unchanged: 0, offline: 0, listingErrors: 0,
  leadsFetched: 0, created: 0, merged: 0, duplicates: 0, failed: 0,
})

export async function syncCompanyCompreOAlquile(companyId: string): Promise<CompreOAlquileSyncResult> {
  const result = empty(companyId)
  if (!isNaventConfigured()) return { ...result, status: 'skipped', reason: 'Faltan las credenciales de integrador de Navent (NAVENT_CLIENT_ID/SECRET).' }

  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any)
    .select('id, nombre, email, comprealquile_enabled, comprealquile_codigo, comprealquile_plan, comprealquile_last_sync_at, comprealquile_leads_imported')
    .eq('id', companyId)
    .maybeSingle()
  if (!company?.comprealquile_enabled || !company?.comprealquile_codigo) {
    return { ...result, status: 'skipped', reason: 'Compre o Alquile no está activado para esta empresa.' }
  }
  if ((await getCompanyAccess(companyId)).blocked) {
    return { ...result, status: 'skipped', reason: 'Suscripción inactiva' }
  }
  const codigo: string = company.comprealquile_codigo
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.propsyncia.com'
  const errors: string[] = []

  // ── 1. Listings ────────────────────────────────────────────────────────────
  try {
    const [{ data: props }, { data: rows }, { data: owner }] = await Promise.all([
      (db.from('properties') as any)
        .select(PROPERTY_COLUMNS)
        .eq('company_id', companyId)
        .in('estado_publicacion', ['activo', 'destacado'])
        .eq('disponibilidad', 'disponible')
        .contains('canales_publicados', [PORTAL])
        .order('updated_at', { ascending: false })
        .limit(2000),
      (db.from('portal_listings') as any).select('property_id, status, payload_hash, external_id').eq('company_id', companyId).eq('portal', PORTAL),
      (db.from('agents') as any).select('nombre, email, telefono').eq('company_id', companyId).eq('rol', 'owner').eq('is_active', true).limit(1).maybeSingle(),
    ])
    const desired = (props ?? []) as (NaventProperty & { agente_asignado_id: string | null })[]
    const listings = new Map(((rows ?? []) as ListingRow[]).map((r) => [r.property_id, r]))
    const contacto = {
      nombre: owner?.nombre || company.nombre,
      email: owner?.email || company.email || null,
      telefono: owner?.telefono ? cleanPhone(owner.telefono) : null,
    }

    if (desired.length > 0 || Array.from(listings.values()).some((l) => l.status !== 'offline')) {
      const ops = pickOperaciones(await getOperaciones())
      const tipos = await getTipos()
      const caracCache = new Map<string, CaracteristicaIds>()

      let puts = 0
      for (const p of desired) {
        const tipo = pickTipo(p.property_type_label || detectPropertyType(p.titulo), tipos)
        let caracteristicas: CaracteristicaIds = {}
        if (tipo) {
          if (!caracCache.has(tipo.idTipo)) caracCache.set(tipo.idTipo, pickCaracteristicas(await getCaracteristicas(tipo.idTipo).catch(() => [])))
          caracteristicas = caracCache.get(tipo.idTipo)!
        }
        const lat = num(p.latitude), lng = num(p.longitude)
        const idUbicacion = lat !== null && lng !== null
          ? pickUbicacion(await getUbicacionesPorCoordenadas(lat, lng).catch(() => []))
          : null

        const aviso = buildNaventAviso(p, {
          codigoInmobiliaria: codigo, contacto, operacionVenta: ops.venta, operacionAlquiler: ops.alquiler,
          tipo, idUbicacion, caracteristicas, plan: company.comprealquile_plan, baseUrl,
        })
        const hash = payloadHash(aviso)
        const prev = listings.get(p.id)
        if (prev && prev.payload_hash === hash && prev.status === 'online') { result.unchanged++; continue }
        if (puts >= MAX_PUTS_PER_RUN) continue // the rest go out on the next run
        puts++

        try {
          const res = await navent<AvisoResponse>(`/v1/inmobiliarias/${encodeURIComponent(codigo)}/avisos/${p.id}`, { method: 'PUT', body: aviso })
          const portalErrors = (res?.errors ?? []).map((e) => e.messageText || e.messageCode).filter(Boolean) as string[]
          const warnings = (res?.warnings ?? []).map((e) => e.messageText || e.messageCode).filter(Boolean) as string[]
          const ok = portalErrors.length === 0
          await (db.from('portal_listings') as any).upsert({
            company_id: companyId, property_id: p.id, portal: PORTAL,
            external_id: res?.idAviso ? String(res.idAviso) : prev?.external_id ?? null,
            status: ok ? 'online' : 'error',
            payload_hash: ok ? hash : null,
            messages: [...portalErrors.map((m) => ({ type: 'error', text: m })), ...warnings.map((m) => ({ type: 'warning', text: m }))],
            synced_at: new Date().toISOString(),
          }, { onConflict: 'property_id,portal' })
          if (ok) result.published++
          else { result.listingErrors++; errors.push(`${p.titulo}: ${portalErrors[0]}`) }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          result.listingErrors++
          errors.push(`${p.titulo}: ${msg}`)
          await (db.from('portal_listings') as any).upsert({
            company_id: companyId, property_id: p.id, portal: PORTAL, status: 'error', payload_hash: null,
            messages: [{ type: 'error', text: msg.slice(0, 500) }], synced_at: new Date().toISOString(),
          }, { onConflict: 'property_id,portal' })
          if (err instanceof NaventError && (err.status === 401 || err.status === 403)) break // credentials/link problem — stop this run
        }
      }

      // Take offline what no longer qualifies (sold, inactive, portal unticked, deleted).
      const desiredIds = new Set(desired.map((p) => p.id))
      for (const l of Array.from(listings.values())) {
        if (desiredIds.has(l.property_id) || l.status === 'offline') continue
        try {
          await navent(`/v1/inmobiliarias/${encodeURIComponent(codigo)}/avisos/${l.property_id}`, { method: 'DELETE' })
        } catch (err) {
          if (!(err instanceof NaventError && err.status === 404)) { // 404 = already gone
            errors.push(`Despublicar: ${err instanceof Error ? err.message : err}`)
            continue
          }
        }
        await (db.from('portal_listings') as any)
          .update({ status: 'offline', payload_hash: null, synced_at: new Date().toISOString() })
          .eq('property_id', l.property_id).eq('portal', PORTAL)
        result.offline++
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }

  // ── 2. Contacts ────────────────────────────────────────────────────────────
  try {
    const since = company.comprealquile_last_sync_at
      ? new Date(new Date(company.comprealquile_last_sync_at).getTime() - 86_400_000) // 1-day overlap; dedupe handles repeats
      : new Date(Date.now() - 7 * 86_400_000)
    const leads: PortalLead[] = []
    for (let page = 0; page < 20; page++) {
      const res = await navent<{ content?: Record<string, unknown>[]; total?: number; size?: number }>(
        `/v2/inmobiliarias/${encodeURIComponent(codigo)}/mensajes`,
        { query: { fromDate: naventDay(since), 'pageable.size': 100, 'pageable.page': page } },
      )
      const content = res?.content ?? []
      for (const m of content) {
        const telefono = cleanPhone(String(m.telefono ?? ''))
        const email = String(m.email ?? '').trim().toLowerCase()
        const codigoAviso = String(m.codigoAviso ?? '')
        leads.push({
          externalId: String(m.idMensaje ?? m.id ?? ''),
          propertyId: UUID_RE.test(codigoAviso) ? codigoAviso : null,
          mensaje: m.textoMensaje ? String(m.textoMensaje) : null,
          nombre: String(m.nombre ?? '').trim() || email || telefono || 'Lead Compre o Alquile',
          email: email || null,
          telefono: telefono || null,
          pais: detectCountry(telefono),
          tipoPropiedad: 'Otro',
          tituloPropiedad: '',
          status: '',
          createdAt: parseNaventDate(m.fecha as string),
        })
      }
      if (content.length === 0 || (res?.total !== undefined && (page + 1) * 100 >= res.total)) break
    }
    const valid = leads.filter((l) => l.externalId).sort((a, b) => a.createdAt - b.createdAt)
    result.leadsFetched = valid.length
    Object.assign(result, await ingestPortalLeads(companyId, 'comprealquile', valid))
  } catch (err) {
    errors.push(`Contactos: ${err instanceof Error ? err.message : err}`)
  }

  await (db.from('companies') as any)
    .update({
      comprealquile_last_sync_at: new Date().toISOString(),
      comprealquile_last_error: errors.length ? errors.slice(0, 3).join(' · ').slice(0, 900) : null,
      comprealquile_leads_imported: (Number(company.comprealquile_leads_imported) || 0) + result.created,
    })
    .eq('id', companyId)

  if (errors.length && result.published === 0 && result.created === 0 && result.unchanged === 0) {
    result.status = 'error'
    result.reason = errors[0]
  }
  return result
}

/** Take every listing of a company offline (used when the integration is deactivated). */
export async function unpublishAllCompreOAlquile(companyId: string): Promise<number> {
  if (!isNaventConfigured()) return 0
  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any).select('comprealquile_codigo').eq('id', companyId).maybeSingle()
  if (!company?.comprealquile_codigo) return 0
  const { data: rows } = await (db.from('portal_listings') as any)
    .select('property_id').eq('company_id', companyId).eq('portal', PORTAL).neq('status', 'offline')
  let n = 0
  for (const r of (rows ?? []) as { property_id: string }[]) {
    try {
      await navent(`/v1/inmobiliarias/${encodeURIComponent(company.comprealquile_codigo)}/avisos/${r.property_id}`, { method: 'DELETE' })
    } catch (err) {
      if (!(err instanceof NaventError && err.status === 404)) continue
    }
    await (db.from('portal_listings') as any).update({ status: 'offline', payload_hash: null, synced_at: new Date().toISOString() })
      .eq('property_id', r.property_id).eq('portal', PORTAL)
    n++
  }
  return n
}

export async function syncAllCompreOAlquile(): Promise<CompreOAlquileSyncResult[]> {
  if (!isNaventConfigured()) return []
  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('id').eq('comprealquile_enabled', true).not('comprealquile_codigo', 'is', null)
  const results: CompreOAlquileSyncResult[] = []
  for (const c of (data ?? []) as { id: string }[]) {
    try { results.push(await syncCompanyCompreOAlquile(c.id)) }
    catch (err) { results.push({ ...empty(c.id), status: 'error', reason: err instanceof Error ? err.message : String(err) }) }
  }
  return results
}

/** Code we ask Compre o Alquile to link this agency under. */
export function defaultCompreOAlquileCodigo(companyId: string): string {
  return `propsync-${companyId.replace(/-/g, '').slice(0, 10)}`
}
