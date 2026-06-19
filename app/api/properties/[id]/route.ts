import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const { data, error } = await db
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const body = await request.json()
  const db = createAdminClient()

  const allowed = [
    'titulo', 'descripcion', 'address', 'country_label', 'region_label', 'ciudad', 'zona',
    'tipo', 'for_sale', 'for_rent', 'for_transfer',
    'property_type_label', 'property_condition_label',
    'precio', 'iso_currency', 'sale_price', 'rent_price', 'maintenance_fee',
    'bedrooms', 'bathrooms', 'half_bathrooms', 'garages',
    'area', 'built_area', 'private_area', 'building_date',
    'estado_publicacion', 'disponibilidad',
    'etapa_crm', 'cliente_nombre', 'cliente_email', 'cliente_telefono',
    'agente_asignado_id', 'fecha_seguimiento', 'notas',
    'whatsapp_estado', 'telefono_propietario',
    'main_image_url', 'gallery_urls',
    'tour_rooms',
    'features_internal', 'features_external',
    'commission_type', 'commission_value', 'commission_notes',
    'ext_commission_type', 'ext_commission_value', 'ext_commission_notes',
    'owner_contact_id',
  ]

  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const { data, error } = await (db.from('properties') as any)
    .update(patch)
    .eq('id', params.id)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()

  const { error } = await db
    .from('properties')
    .delete()
    .eq('id', params.id)
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
