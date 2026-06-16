import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = createAdminClient()
  const { data, error } = await db
    .from('properties')
    .select(SELECT)
    .eq('id', params.id)
    .in('estado_publicacion', ['activo', 'destacado'])
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Propiedad no encontrada o no publicada' }, { status: 404 })
  }

  return NextResponse.json(data)
}
