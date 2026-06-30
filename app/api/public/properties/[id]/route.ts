import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { isValidUuid } from '@/lib/validation'
import { checkPublicReadRateLimit, getClientIp, rateLimited } from '@/lib/rate-limit'

const SELECT = `
  id, titulo, descripcion, tipo, for_sale, for_rent,
  property_type_label, property_condition_label,
  country_label, region_label, ciudad, zona, address, floor,
  precio, iso_currency, sale_price, rent_price, maintenance_fee,
  area, built_area, private_area, bedrooms, bathrooms, half_bathrooms,
  garages, furnished, building_date,
  estado_publicacion, disponibilidad,
  main_image_url, gallery_urls, video,
  features_internal, features_external,
  created_at
`

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = checkPublicReadRateLimit(getClientIp(req))
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en un minuto.' },
      { status: 429, ...rateLimited(rl.resetAt) },
    )
  }

  // Validate the id before hitting the DB — avoids a wasted query (and a noisy
  // Postgres cast error) on garbage ids.
  if (!isValidUuid(params.id)) {
    return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('properties')
    .select(SELECT)
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
  }

  return NextResponse.json(data)
}
