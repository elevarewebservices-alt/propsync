import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId, getSessionPermissions } from '@/lib/auth'
import { upsertFromWasi } from '@/lib/properties'
import type { PropertyInsert } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const WASI_BASE = 'https://api.wasi.co/v1'
const PAGE_SIZE = 100

interface WasiImage {
  url: string
  url_big?: string
  url_original?: string
  description?: string
  position?: string
}

interface WasiProperty {
  id_property: number
  title: string
  observations?: string
  address?: string
  for_sale?: string
  for_rent?: string
  for_transfer?: string
  property_type_label?: string
  property_condition_label?: string
  country_label?: string
  region_label?: string
  city_label?: string
  zone_label?: string
  latitude?: string
  longitude?: string
  zip_code?: string
  floor?: string
  iso_currency?: string
  sale_price?: string
  rent_price?: string
  maintenance_fee?: string
  rents_type_label?: string
  area?: string
  built_area?: string
  bedrooms?: string
  bathrooms?: string
  half_bathrooms?: string
  garages?: string
  furnished?: string
  id_status_on_page?: string
  status_on_page_label?: string
  id_availability?: string
  availability_label?: string
  visits?: number
  network_share?: boolean
  video?: string
  reference?: string
  telefono?: string
  main_image?: WasiImage
  galleries?: Record<string, Record<string, WasiImage>>
  features?: { internal?: { id: string; nombre: string }[]; external?: { id: string; nombre: string }[] }
}

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

function mapWasiToInsert(p: WasiProperty, companyId: string): PropertyInsert {
  const forSale = p.for_sale === 'true'
  const forRent = p.for_rent === 'true'
  const salePrice = p.sale_price ? parseFloat(p.sale_price) : null
  const rentPrice = p.rent_price ? parseFloat(p.rent_price) : null

  // Flatten galleries to array of image URLs
  const galleryUrls: string[] = []
  if (p.galleries) {
    for (const gallery of Object.values(p.galleries)) {
      for (const [key, img] of Object.entries(gallery)) {
        if (key !== 'id' && typeof img === 'object' && img.url) {
          galleryUrls.push(img.url)
        }
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
    bedrooms: p.bedrooms ? parseInt(p.bedrooms) : null,
    bathrooms: p.bathrooms ? parseInt(p.bathrooms) : null,
    half_bathrooms: p.half_bathrooms ? parseInt(p.half_bathrooms) : null,
    garages: p.garages ? parseInt(p.garages) : null,
    furnished: p.furnished === 'true' ? true : p.furnished === 'false' ? false : null,
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
    private_area: null,
    building_date: null,
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

export async function POST(_request: NextRequest) {
  const companyId = await resolveCompanyId()
  if (!(await getSessionPermissions()).accessSettings) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Get Wasi credentials from company record
  const db = createAdminClient()
  const { data: company, error: companyError } = await db
    .from('companies')
    .select('wasi_token, wasi_company_id')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  }

  const { wasi_token, wasi_company_id } = company

  if (!wasi_token || !wasi_company_id) {
    return NextResponse.json(
      { error: 'Credenciales de Wasi no configuradas. Ve a Configuración → Fuentes.' },
      { status: 422 }
    )
  }

  // Paginate through all Wasi properties
  const allProps: WasiProperty[] = []
  let skip = 0

  while (true) {
    const url = new URL(`${WASI_BASE}/property/search`)
    url.searchParams.set('wasi_token', wasi_token)
    url.searchParams.set('id_company', wasi_company_id)
    url.searchParams.set('scope', '1')
    url.searchParams.set('take', String(PAGE_SIZE))
    url.searchParams.set('skip', String(skip))

    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    if (!res.ok) {
      return NextResponse.json({ error: `Wasi API error: ${res.status}` }, { status: 502 })
    }

    const json = await res.json() as Record<string, unknown>
    const total = json.total as number ?? 0

    for (const [key, val] of Object.entries(json)) {
      if (!isNaN(Number(key)) && typeof val === 'object' && val !== null) {
        allProps.push(val as WasiProperty)
      }
    }

    skip += PAGE_SIZE
    if (skip >= total || allProps.length >= total) break
  }

  if (allProps.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No se encontraron propiedades en Wasi.' })
  }

  const inserts = allProps.map((p) => mapWasiToInsert(p, companyId))
  const result = await upsertFromWasi(companyId, inserts)

  // Mark last sync timestamp on the company record
  await (db.from('companies') as any)
    .update({ last_wasi_sync_at: new Date().toISOString() })
    .eq('id', companyId)

  return NextResponse.json({
    synced: inserts.length,
    ...result,
    message: `${inserts.length} propiedades sincronizadas desde Wasi.`,
  })
}
