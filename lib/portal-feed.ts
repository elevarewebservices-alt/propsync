// Outbound XML listings feed consumed by real-estate portals (Encuentra24,
// Compre o Alquile, …). Pure functions only — the route in
// app/feeds/[token]/[file]/route.ts does auth + the DB query and hands rows here.
//
// The format is a self-describing, portal-neutral schema (one <propiedad> per
// listing, all photos, coordinates, features, agency + agent contact). Portal
// integration teams map a feed like this on their side; if a portal later
// sends a strict spec of its own, add a dedicated serializer next to this one
// and route `<portal>.xml` to it.

import { CANALES_PUBLICACION } from './canales'

// Portals that get a feed URL. 'pagina_web' is PropSync's own public page, not
// an external portal, so it has no feed. 'todos' = every publishable listing
// regardless of channel (handy for an agency's own website or a new portal).
export const FEED_PORTALS = [
  ...CANALES_PUBLICACION.filter((c) => c.id !== 'pagina_web'),
  { id: 'todos', nombre: 'Todas las propiedades activas' },
] as const

export type FeedPortalId = (typeof FEED_PORTALS)[number]['id']

export function isFeedPortal(id: string): id is FeedPortalId {
  return FEED_PORTALS.some((p) => p.id === id)
}

export const FEED_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Columns the feed needs — keep the route's select() in sync with this. */
export const FEED_PROPERTY_COLUMNS = [
  'id', 'reference', 'titulo', 'descripcion', 'tipo', 'for_sale', 'for_rent',
  'property_type_label', 'property_condition_label',
  'country_label', 'region_label', 'ciudad', 'zona', 'address', 'latitude', 'longitude',
  'precio', 'iso_currency', 'sale_price', 'rent_price', 'maintenance_fee',
  'area', 'built_area', 'bedrooms', 'bathrooms', 'half_bathrooms', 'garages', 'floor', 'furnished',
  'estado_publicacion', 'main_image_url', 'gallery_urls', 'video',
  'features_internal', 'features_external', 'tour_rooms', 'agente_asignado_id',
  'created_at', 'updated_at',
].join(', ')

export interface FeedProperty {
  id: string
  reference: string | null
  titulo: string
  descripcion: string | null
  tipo: 'venta' | 'arriendo'
  for_sale: boolean | null
  for_rent: boolean | null
  property_type_label: string | null
  property_condition_label: string | null
  country_label: string | null
  region_label: string | null
  ciudad: string | null
  zona: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
  precio: number
  iso_currency: string | null
  sale_price: number | null
  rent_price: number | null
  maintenance_fee: number | null
  area: string | null
  built_area: string | null
  bedrooms: number | null
  bathrooms: number | null
  half_bathrooms: number | null
  garages: number | null
  floor: string | null
  furnished: boolean | null
  estado_publicacion: string
  main_image_url: string | null
  gallery_urls: unknown
  video: string | null
  features_internal: unknown
  features_external: unknown
  tour_rooms: unknown
  agente_asignado_id: string | null
  created_at: string
  updated_at: string
}

export interface FeedAgent {
  nombre: string
  email: string | null
  telefono: string | null
}

export interface FeedInput {
  portal: FeedPortalId
  baseUrl: string
  company: { id: string; nombre: string; email: string | null; telefono: string | null }
  properties: FeedProperty[]
  agents: Map<string, FeedAgent>
  generatedAt?: Date
}

// ── XML helpers ──────────────────────────────────────────────────────────────

// Strip characters that are illegal in XML 1.0 (control chars other than tab /
// newline / CR). One stray \u0008 pasted from Word would otherwise make the
// whole feed unparseable for the portal — and every listing would drop off.
// eslint-disable-next-line no-control-regex
const ILLEGAL_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

export function escapeXml(value: string): string {
  return value
    .replace(ILLEGAL_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cdata(value: string): string {
  // "]]>" can't appear inside CDATA — split it across two sections.
  return `<![CDATA[${value.replace(ILLEGAL_XML, '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

type Attrs = Record<string, string | number | undefined>

function tag(name: string, value: string | number | boolean | null | undefined, attrs?: Attrs): string {
  if (value === null || value === undefined || value === '') return ''
  const a = attrs
    ? Object.entries(attrs)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
        .join('')
    : ''
  const body = typeof value === 'boolean' ? (value ? 'true' : 'false') : escapeXml(String(value))
  return `<${name}${a}>${body}</${name}>`
}

/** Parse "120", "120.5", "1,250", "85 m2" → number, else null. */
export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  // First numeric token only — "85 m2" must not become 852.
  const cleaned = value.match(/-?\d[\d.,]*/)?.[0]?.replace(/[.,]$/, '')
  if (!cleaned) return null
  // "1,250" (thousands) vs "120,5" (decimal): a comma followed by exactly three
  // digits at the end is a thousands separator.
  const normalized = /,\d{3}$/.test(cleaned) && !cleaned.includes('.')
    ? cleaned.replace(/,/g, '')
    : cleaned.replace(/,/g, '.')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? ((v as { nombre?: unknown; url?: unknown }).nombre ?? (v as { url?: unknown }).url) : null))
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
}

function absoluteUrl(url: string, baseUrl: string): string | null {
  try {
    return new URL(url, baseUrl).href
  } catch {
    return null
  }
}

export function propertyImages(p: FeedProperty, baseUrl: string): string[] {
  const urls = [...(p.main_image_url ? [p.main_image_url] : []), ...stringList(p.gallery_urls)]
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    const abs = absoluteUrl(u, baseUrl)
    if (abs && /^https?:\/\//.test(abs) && !seen.has(abs)) {
      seen.add(abs)
      out.push(abs)
    }
  }
  return out
}

// ── Serializer ───────────────────────────────────────────────────────────────

function serializeProperty(p: FeedProperty, input: FeedInput): string {
  const { baseUrl, company, agents } = input
  const currency = (p.iso_currency || 'USD').toUpperCase()
  const isRent = p.tipo === 'arriendo'
  const salePrice = p.sale_price ?? (isRent ? null : p.precio)
  const rentPrice = p.rent_price ?? (isRent ? p.precio : null)
  const operaciones = [
    ...(p.for_sale || (!isRent && p.for_sale !== false) ? ['venta'] : []),
    ...(p.for_rent || isRent ? ['alquiler'] : []),
  ]
  const images = propertyImages(p, baseUrl)
  const features = [...stringList(p.features_internal), ...stringList(p.features_external)]
  const hasTour = Array.isArray(p.tour_rooms) && p.tour_rooms.length > 0
  const agent = p.agente_asignado_id ? agents.get(p.agente_asignado_id) : undefined

  const lines = [
    '<propiedad>',
    tag('id', p.id),
    tag('referencia', p.reference || p.id.slice(0, 8).toUpperCase()),
    tag('fecha_creacion', p.created_at),
    tag('fecha_actualizacion', p.updated_at),
    tag('operacion', isRent ? 'alquiler' : 'venta'),
    operaciones.length > 1 ? `<operaciones>${operaciones.map((o) => tag('operacion', o)).join('')}</operaciones>` : '',
    tag('tipo_propiedad', p.property_type_label),
    tag('condicion', p.property_condition_label),
    tag('destacado', p.estado_publicacion === 'destacado'),
    `<titulo>${cdata(p.titulo)}</titulo>`,
    p.descripcion ? `<descripcion>${cdata(p.descripcion)}</descripcion>` : '',
    tag('precio', p.precio, { moneda: currency }),
    tag('precio_venta', salePrice, { moneda: currency }),
    tag('precio_alquiler', rentPrice, { moneda: currency, periodo: rentPrice !== null ? 'mensual' : undefined }),
    tag('cuota_mantenimiento', p.maintenance_fee, { moneda: currency }),
    '<ubicacion>',
    tag('pais', p.country_label || 'Panamá'),
    tag('provincia', p.region_label),
    tag('ciudad', p.ciudad),
    tag('zona', p.zona),
    tag('direccion', p.address),
    tag('latitud', toNumber(p.latitude)),
    tag('longitud', toNumber(p.longitude)),
    '</ubicacion>',
    tag('habitaciones', p.bedrooms),
    tag('banos', p.bathrooms),
    tag('medios_banos', p.half_bathrooms),
    tag('estacionamientos', p.garages),
    tag('piso', p.floor),
    tag('area_total', toNumber(p.area), { unidad: 'm2' }),
    tag('area_construida', toNumber(p.built_area), { unidad: 'm2' }),
    p.furnished === null ? '' : tag('amoblado', p.furnished),
    features.length ? `<caracteristicas>${features.map((f) => tag('caracteristica', f)).join('')}</caracteristicas>` : '',
    images.length ? `<imagenes>${images.map((u, i) => tag('imagen', u, { orden: i + 1 })).join('')}</imagenes>` : '',
    tag('video', p.video),
    hasTour ? tag('tour_virtual', `${baseUrl}/tour/${p.id}`) : '',
    tag('url', `${baseUrl}/p/${p.id}`),
    '<contacto>',
    tag('inmobiliaria', company.nombre),
    tag('agente', agent?.nombre),
    tag('email', agent?.email || company.email),
    tag('telefono', agent?.telefono || company.telefono),
    '</contacto>',
    '</propiedad>',
  ]
  return lines.filter(Boolean).join('\n    ')
}

export function buildPortalFeed(input: FeedInput): string {
  const generatedAt = (input.generatedAt ?? new Date()).toISOString()
  const body = input.properties.map((p) => '  ' + serializeProperty(p, input)).join('\n')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<propsync_feed version="1.0" portal="${escapeXml(input.portal)}" generado="${generatedAt}" total="${input.properties.length}">`,
    '<inmobiliaria>',
    '  ' + tag('id', input.company.id),
    '  ' + tag('nombre', input.company.nombre),
    input.company.email ? '  ' + tag('email', input.company.email) : '',
    input.company.telefono ? '  ' + tag('telefono', input.company.telefono) : '',
    '</inmobiliaria>',
    '<propiedades>',
    body,
    '</propiedades>',
    '</propsync_feed>',
    '',
  ].filter((l) => l !== '').join('\n') + '\n'
}
