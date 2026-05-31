import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { upsertFromWasi } from '@/lib/properties'
import type { PropertyInsert } from '@/lib/database.types'

const WASI_BASE = 'https://api.wasi.co/v1'
const PAGE_SIZE = 100

function mapStatusOnPage(id?: string): 'activo' | 'destacado' | 'inactivo' {
  if (id === '3') return 'destacado'
  if (id === '2' || id === '4') return 'inactivo'
  return 'activo'
}

function mapAvailability(id?: string): 'disponible' | 'vendido' | 'alquilado' {
  if (id === '2') return 'vendido'
  if (id === '3') return 'alquilado'
  return 'disponible'
}

function mapProp(p: Record<string, any>, companyId: string): PropertyInsert {
  const forSale = p.for_sale === 'true'
  const forRent = p.for_rent === 'true'
  const salePrice = p.sale_price ? parseFloat(p.sale_price) : null
  const rentPrice = p.rent_price ? parseFloat(p.rent_price) : null

  const galleryUrls: string[] = []
  if (p.galleries) {
    for (const gallery of Object.values(p.galleries) as any[]) {
      for (const [key, img] of Object.entries(gallery) as any[]) {
        if (key !== 'id' && typeof img === 'object' && img?.url) galleryUrls.push(img.url)
      }
    }
  }

  return {
    company_id: companyId,
    wasi_id: String(p.id_property),
    titulo: p.title ?? `Propiedad ${p.id_property}`,
    descripcion: p.observations ?? null,
    address: p.address ?? null,
    reference: p.reference ?? null,
    tipo: forSale ? 'venta' : 'arriendo',
    for_sale: forSale,
    for_rent: forRent,
    for_transfer: p.for_transfer === 'true',
    property_type_label: p.property_type_label ?? null,
    property_condition_label: p.property_condition_label ?? null,
    country_label: p.country_label ?? 'Panamá',
    region_label: p.region_label ?? null,
    ciudad: p.city_label ?? null,
    zona: p.zone_label ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    zip_code: p.zip_code ?? null,
    floor: p.floor ?? null,
    precio: salePrice ?? rentPrice ?? 0,
    iso_currency: p.iso_currency ?? 'USD',
    sale_price: salePrice,
    rent_price: rentPrice,
    maintenance_fee: p.maintenance_fee ? parseFloat(p.maintenance_fee) : null,
    rents_type_label: p.rents_type_label ?? null,
    area: p.area ?? null,
    built_area: p.built_area ?? null,
    private_area: null,
    bedrooms: p.bedrooms ? parseInt(p.bedrooms) : null,
    bathrooms: p.bathrooms ? parseInt(p.bathrooms) : null,
    half_bathrooms: p.half_bathrooms ? parseInt(p.half_bathrooms) : null,
    garages: p.garages ? parseInt(p.garages) : null,
    furnished: p.furnished === 'true' ? true : p.furnished === 'false' ? false : null,
    building_date: null,
    id_status_on_page: p.id_status_on_page ?? null,
    id_availability: p.id_availability ?? null,
    availability_label: p.availability_label ?? null,
    visits: p.visits ?? 0,
    network_share: p.network_share ?? false,
    main_image_url: p.main_image?.url ?? null,
    gallery_urls: galleryUrls,
    video: p.video ?? null,
    features_internal: p.features?.internal ?? [],
    features_external: p.features?.external ?? [],
    estado_publicacion: mapStatusOnPage(p.id_status_on_page),
    disponibilidad: mapAvailability(p.id_availability),
    etapa_crm: 'prospecto',
    cliente_nombre: null,
    cliente_email: null,
    agente_asignado_id: null,
    fecha_seguimiento: null,
    notas: null,
    brevo_deal_id: null,
    canales_publicados: [],
    whatsapp_estado: 'no_contactado',
    telefono_propietario: p.telefono ?? null,
    fuente: 'wasi',
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const { data: companies, error } = await db
    .from('companies')
    .select('id, wasi_token, wasi_company_id')
    .not('wasi_token', 'is', null)
    .not('wasi_company_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { company_id: string; synced: number; error?: string }[] = []

  for (const company of (companies as any[] ?? [])) {
    try {
      const allProps: Record<string, any>[] = []
      let skip = 0

      while (true) {
        const url = new URL(`${WASI_BASE}/property/search`)
        url.searchParams.set('wasi_token', company.wasi_token)
        url.searchParams.set('id_company', company.wasi_company_id)
        url.searchParams.set('scope', '1')
        url.searchParams.set('take', String(PAGE_SIZE))
        url.searchParams.set('skip', String(skip))

        const res = await fetch(url.toString(), { next: { revalidate: 0 } })
        if (!res.ok) break

        const json = await res.json() as Record<string, unknown>
        const total = (json.total as number) ?? 0
        for (const [key, val] of Object.entries(json)) {
          if (!isNaN(Number(key)) && typeof val === 'object' && val !== null) {
            allProps.push(val as Record<string, any>)
          }
        }
        skip += PAGE_SIZE
        if (skip >= total || allProps.length >= total) break
      }

      if (allProps.length > 0) {
        const inserts = allProps.map((p) => mapProp(p, company.id))
        await upsertFromWasi(company.id, inserts)
      }

      results.push({ company_id: company.id, synced: allProps.length })
    } catch (err) {
      results.push({ company_id: company.id, synced: 0, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results })
}
