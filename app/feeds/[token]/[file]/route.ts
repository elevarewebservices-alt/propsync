import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getCompanyAccess } from '@/lib/subscription'
import { canAccessChannel } from '@/lib/plans'
import { checkPublicReadRateLimit, getClientIp, rateLimited } from '@/lib/rate-limit'
import {
  buildPortalFeed, isFeedPortal, FEED_PROPERTY_COLUMNS, FEED_TOKEN_RE,
  type FeedAgent, type FeedProperty,
} from '@/lib/portal-feed'
import type { PlanId } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MAX_LISTINGS = 5000

function xmlError(status: number, message: string, headers: Record<string, string> = {}) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<error>${message}</error>\n`,
    { status, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store', ...headers } },
  )
}

/**
 * GET /feeds/<feed_token>/<portal>.xml — public listings feed for a portal.
 *
 * Portals can't send auth headers, so the secret is the per-company feed_token
 * in the path (regenerable from Configuración → Fuentes). It only exposes what
 * the agency already chose to publish: estado activo/destacado, disponible, and
 * — except for todos.xml — marked for that portal in "Lugares de publicación".
 * Internal CRM fields (commissions, owner, client, notes) are never selected.
 */
export async function GET(request: NextRequest, { params }: { params: { token: string; file: string } }) {
  const ip = checkPublicReadRateLimit(getClientIp(request))
  if (!ip.allowed) return xmlError(429, 'Demasiadas solicitudes', rateLimited(ip.resetAt).headers)

  const portal = params.file.replace(/\.xml$/i, '')
  if (!FEED_TOKEN_RE.test(params.token) || !params.file.toLowerCase().endsWith('.xml') || !isFeedPortal(portal)) {
    return xmlError(404, 'Feed no encontrado')
  }

  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any)
    .select('id, nombre, email, plan_id, feed_last_access')
    .eq('feed_token', params.token)
    .maybeSingle()
  if (!company) return xmlError(404, 'Feed no encontrado')

  // A lapsed account stops feeding the portals. We answer with an error rather
  // than an empty feed: portals keep the last good import on a failed fetch,
  // whereas an empty feed would make them delete every listing at once — too
  // destructive for a late ACH transfer. Once a payment is registered the next
  // fetch goes through again.
  const access = await getCompanyAccess(company.id)
  if (access.blocked) return xmlError(402, 'Suscripción inactiva')

  if (portal !== 'todos' && !canAccessChannel(company.plan_id as PlanId, portal)) {
    return xmlError(403, 'Este portal no está incluido en el plan')
  }

  let query = (db.from('properties') as any)
    .select(FEED_PROPERTY_COLUMNS)
    .eq('company_id', company.id)
    .in('estado_publicacion', ['activo', 'destacado'])
    .eq('disponibilidad', 'disponible')
    .order('updated_at', { ascending: false })
    .limit(MAX_LISTINGS)
  if (portal !== 'todos') query = query.contains('canales_publicados', [portal])

  const [{ data: properties, error }, { data: agentRows }] = await Promise.all([
    query,
    (db.from('agents') as any)
      .select('id, nombre, email, telefono, rol, is_active')
      .eq('company_id', company.id),
  ])
  if (error) return xmlError(500, 'No se pudo generar el feed')

  const agents = new Map<string, FeedAgent>()
  let ownerPhone: string | null = null
  for (const a of (agentRows ?? []) as { id: string; nombre: string; email: string | null; telefono: string | null; rol: string; is_active: boolean }[]) {
    if (a.is_active) agents.set(a.id, { nombre: a.nombre, email: a.email, telefono: a.telefono })
    if (a.rol === 'owner' && a.telefono && !ownerPhone) ownerPhone = a.telefono
  }

  const xml = buildPortalFeed({
    portal,
    baseUrl: new URL(request.url).origin,
    company: { id: company.id, nombre: company.nombre, email: company.email, telefono: ownerPhone },
    properties: (properties ?? []) as FeedProperty[],
    agents,
  })

  // Record the fetch so the agency / admin panel can see the portal is reading
  // the feed. Awaited (serverless may freeze un-awaited work after the
  // response), but a failed write must never break the feed itself.
  const lastAccess = { ...(company.feed_last_access ?? {}), [portal]: new Date().toISOString() }
  try {
    await (db.from('companies') as any).update({ feed_last_access: lastAccess }).eq('id', company.id)
  } catch { /* ignore */ }

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Total-Count': String((properties ?? []).length),
    },
  })
}
