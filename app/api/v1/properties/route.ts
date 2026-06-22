import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-key'
import { checkApiRateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 500

/**
 * GET /api/v1/properties — Exporta el inventario completo de la empresa
 * (todos los campos, incluyendo galería de imágenes) autenticado por API key.
 *
 * Auth: Authorization: Bearer <api_key>
 * Query: limit (máx 500, default 100), offset (default 0)
 */
export async function GET(request: NextRequest) {
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
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, MAX_LIMIT)
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
