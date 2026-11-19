// OpenNavent RELA API client (Compre o Alquile). Platform-level integrator
// credentials — PropSync/Elevare is the integrator, agencies are addressed by
// codigoInmobiliaria. Credentials are issued by Navent (integracion@navent.com)
// and live only in env vars: NAVENT_CLIENT_ID, NAVENT_CLIENT_SECRET,
// NAVENT_API_URL (default production RELA host).
//
// Auth: POST /v1/application/login?grant_type=client_credentials&client_id&client_secret
// → OAuth2AccessToken { value, expiresIn }. The token is passed as the
// access_token query parameter (as in Navent's Swagger UI).

import type { NaventType, NaventCaracteristica, NaventUbicacion } from './navent-mapping'

const DEFAULT_API = 'https://api-rela-open.navent.com'

export function isNaventConfigured(): boolean {
  return Boolean(process.env.NAVENT_CLIENT_ID && process.env.NAVENT_CLIENT_SECRET)
}

function apiBase(): string {
  return (process.env.NAVENT_API_URL || DEFAULT_API).replace(/\/$/, '')
}

let tokenCache: { value: string; expiresAt: number } | null = null

async function getToken(force = false): Promise<string> {
  if (!force && tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value
  const url = new URL(`${apiBase()}/v1/application/login`)
  url.searchParams.set('grant_type', 'client_credentials')
  url.searchParams.set('client_id', process.env.NAVENT_CLIENT_ID ?? '')
  url.searchParams.set('client_secret', process.env.NAVENT_CLIENT_SECRET ?? '')
  const res = await fetch(url, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`Compre o Alquile (login) respondió ${res.status}`)
  const json = await res.json() as { value?: string; access_token?: string; expiresIn?: number; expires_in?: number }
  const value = json.value ?? json.access_token
  if (!value) throw new Error('Compre o Alquile no devolvió un token')
  const ttl = Number(json.expiresIn ?? json.expires_in ?? 3600)
  tokenCache = { value, expiresAt: Date.now() + ttl * 1000 }
  return value
}

export class NaventError extends Error {
  constructor(message: string, public status: number, public body: unknown) { super(message) }
}

export async function navent<T = unknown>(
  path: string,
  { method = 'GET', query, body }: { method?: string; query?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<T> {
  const call = async (token: string) => {
    const url = new URL(`${apiBase()}${path}`)
    url.searchParams.set('access_token', token)
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    return fetch(url, {
      method,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
      headers: body !== undefined ? { 'Content-Type': 'application/json', accept: 'application/json' } : { accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }
  let res = await call(await getToken())
  if (res.status === 401) res = await call(await getToken(true)) // token revoked/expired early
  const text = await res.text()
  let parsed: unknown = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  if (!res.ok) {
    const detail = typeof parsed === 'string' ? parsed.slice(0, 300) : JSON.stringify(parsed)?.slice(0, 300)
    throw new NaventError(`Compre o Alquile respondió ${res.status}${detail ? `: ${detail}` : ''}`, res.status, parsed)
  }
  return parsed as T
}

// ── Catalogs (cached per server instance for 6 h) ───────────────────────────

const CATALOG_TTL = 6 * 3600_000
const catalogCache = new Map<string, { at: number; value: unknown }>()

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = catalogCache.get(key)
  if (hit && Date.now() - hit.at < CATALOG_TTL) return hit.value as T
  const value = await load()
  catalogCache.set(key, { at: Date.now(), value })
  return value
}

export const getOperaciones = () =>
  cached('operaciones', async () => ((await navent<{ operacion: string }[]>('/v1/operaciones')) ?? []).map((o) => o.operacion).filter(Boolean))

export const getTipos = () =>
  cached('tipos', async () => (await navent<NaventType[]>('/v1/tipopropiedades')) ?? [])

export const getCaracteristicas = (idTipo: string) =>
  cached(`carac:${idTipo}`, async () => (await navent<NaventCaracteristica[]>(`/v1/tipopropiedades/${encodeURIComponent(idTipo)}/caracteristicas`)) ?? [])

export const getUbicacionesPorCoordenadas = (lat: number, lng: number) =>
  cached(`ubic:${lat.toFixed(3)},${lng.toFixed(3)}`, async () =>
    (await navent<NaventUbicacion[]>(`/v1/ubicaciones/latitud/${lat}/longitud/${lng}/countrycode/PA`)) ?? [])

/** Agencies Compre o Alquile has linked to the PropSync integration. */
export const getInmobiliariasVinculadas = () =>
  cached('inmobiliarias', async () => {
    const page = await navent<{ content?: { codigoInmobiliaria: string; nombre?: string; bloqueada?: boolean }[] }>('/v1/inmobiliarias', { query: { 'pageable.size': 500 } })
    return page?.content ?? []
  })

export function clearNaventCatalogCache(key?: string) {
  if (key) catalogCache.delete(key)
  else catalogCache.clear()
}
