import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-key'
import { checkApiRateLimit, checkIpRateLimit, getClientIp } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/properties/[id] — Una propiedad completa de la empresa,
 * autenticado por API key (Authorization: Bearer <api_key>).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const db = createAdminClient()
  const { data, error } = await db
    .from('properties')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
  }

  return NextResponse.json(data, { headers: { 'X-RateLimit-Remaining': String(remaining) } })
}
