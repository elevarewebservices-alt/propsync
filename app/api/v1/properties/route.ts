import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-key'
import { checkApiRateLimit, checkIpRateLimit, getClientIp } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 50

/**
 * GET /api/v1/properties — Exporta el inventario completo de la empresa
 * (todos los campos, incluyendo galería de imágenes) autenticado por API key.
 *
 * Auth: Authorization: Bearer <api_key>
 * Query: limit (máx 50, default 50), offset (default 0)
 *
 * Page size and request rate are deliberately capped low (50/page, 20 req/min
 * via checkApiRateLimit) so a leaked key can't pull the full inventory in one
 * burst — bulk extraction is throttled to a steady trickle, not blocked outright.
 */
export async function GET(request: NextRequest) {
  // IP limit runs before auth — protects against one IP flooding the
  // endpoint with junk/invalid-key requests, each of which still costs a
  // Supabase lookup.
  const ipCheck = checkIpRateLimit(getClientIp(request))
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en un minuto.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((ipCheck.resetAt - Date.now()) / 1000)) } }
    )
  }

  const companyId = await authenticateApiKey(request)
  if (!companyId) {
    return NextResponse.json({ error: 'API key inválida o ausente' }, { status: 401 })
  }

  const { allowed, remaining, resetAt } = checkApiRateLimit(companyId)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? String(MAX_LIMIT), 10) || MAX_LIMIT, MAX_LIMIT)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)

  const db = createAdminClient()
  const { data, count, error } = await db
    .from('properties')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    {
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    },
    { headers: { 'X-RateLimit-Remaining': String(remaining) } }
  )
}
