// Pure mapping PropSync property → OpenNavent "aviso" (Compre o Alquile) and
// helpers to read the Navent catalogs. No I/O — tested by
// scripts/test-navent-mapping.mjs.
//
// Field names come from the OpenNavent RELA OpenAPI spec
// (api-rela-open.navent.com/v2/api-docs?group=opennavent-realestate):
// OpenNaventAviso { codigoAviso, claveReferencia, titulo, descripcion,
// tipoDePropiedad{idTipo,tipo,idSubTipo,subTipo}, precios[{moneda,monto,operacion}],
// localizacion{direccion,idUbicacion,latitud,longitud,muestraMapa,ubicacion},
// caracteristicas[{id,valor}], multimedia{imagenes[{urlImagenOriginal,titulo}]},
// publicador{codigoInmobiliaria,emailDeContacto,nombreDeContacto,telefonoDeContacto},
// publicacion{tipoDePublicacion} }.

export interface NaventProperty {
  id: string
  reference: string | null
  titulo: string
  descripcion: string | null
  tipo: 'venta' | 'arriendo'
  property_type_label: string | null
  precio: number
  iso_currency: string | null
  sale_price: number | null
  rent_price: number | null
  address: string | null
  zona: string | null
  ciudad: string | null
  region_label: string | null
  latitude: string | null
  longitude: string | null
  bedrooms: number | null
  bathrooms: number | null
  half_bathrooms: number | null
  garages: number | null
  area: string | null
  built_area: string | null
  main_image_url: string | null
  gallery_urls: unknown
}

export interface NaventType { id: string; categoria?: string; idCategoria?: string }
export interface NaventCaracteristica { id: string; alias?: string[]; categoria?: string }
export interface NaventUbicacion { id: string; nombre?: string; nombreCompleto?: string; localidades?: NaventUbicacion[] }

export interface CaracteristicaIds {
  dormitorios?: string
  banos?: string
  mediosBanos?: string
  estacionamientos?: string
  areaTotal?: string
  areaCubierta?: string
}

export interface NaventContext {
  codigoInmobiliaria: string
  contacto: { nombre: string; email: string | null; telefono: string | null }
  operacionVenta: string
  operacionAlquiler: string
  tipo: { idTipo: string; tipo?: string } | null
  idUbicacion: string | null
  caracteristicas: CaracteristicaIds
  plan?: string | null
  baseUrl: string
}

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** "120", "120,5", "1,250", "85 m2" → number | null. */
export function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const token = value.match(/-?\d[\d.,]*/)?.[0]?.replace(/[.,]$/, '')
  if (!token) return null
  const normalized = /,\d{3}$/.test(token) && !token.includes('.') ? token.replace(/,/g, '') : token.replace(/,/g, '.')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

/** Pick the portal's own spelling of venta / alquiler from GET /v1/operaciones. */
export function pickOperaciones(operaciones: string[]): { venta: string; alquiler: string } {
  const venta = operaciones.find((o) => /venta/i.test(o)) ?? 'Venta'
  const alquiler = operaciones.find((o) => /alquiler|arriendo|renta/i.test(o) && !/temporal|temporario/i.test(o)) ?? 'Alquiler'
  return { venta, alquiler }
}

// PropSync type label → words that identify the Navent type.
const TYPE_SYNONYMS: [RegExp, string[]][] = [
  [/\bph\b|penthouse/i, ['penthouse', 'ph', 'apartamento', 'departamento']],
  [/apartamento|apto|departamento/i, ['apartamento', 'departamento']],
  [/casa/i, ['casa']],
  [/local/i, ['local']],
  [/oficina/i, ['oficina']],
  [/terreno|lote/i, ['terreno', 'lote']],
  [/bodega|galpon|galpón/i, ['bodega', 'galpon', 'deposito']],
  [/edificio/i, ['edificio']],
  [/finca|quinta/i, ['finca', 'quinta', 'campo']],
]

export function pickTipo(label: string | null, tipos: NaventType[]): { idTipo: string; tipo?: string } | null {
  if (!label || tipos.length === 0) return null
  const rule = TYPE_SYNONYMS.find(([re]) => re.test(label))
  const words = rule ? rule[1] : [strip(label)]
  for (const w of words) {
    const hit = tipos.find((t) => strip(t.categoria ?? '').includes(w) || strip(t.id).includes(w))
    if (hit) return { idTipo: hit.id, tipo: hit.categoria }
  }
  return null
}

const CARAC_RULES: [keyof CaracteristicaIds, RegExp, RegExp?][] = [
  ['mediosBanos', /medio[s]? ba[nñ]o|toilette|1\/2 ba/i],
  ['dormitorios', /dormitorio|rec[aá]mara|habitaci[oó]n|cuarto/i],
  ['banos', /ba[nñ]o/i, /medio/i],
  ['estacionamientos', /estacionamiento|cochera|garage|garaje|parking|parqueo/i],
  ['areaTotal', /superficie total|[aá]rea total|metros totales|m2 totales|terreno/i],
  ['areaCubierta', /cubierta|construida|edificada/i],
]

/** Find the characteristic ids for bedrooms/baths/etc. from GET /v1/tipopropiedades/{id}/caracteristicas. */
export function pickCaracteristicas(caracts: NaventCaracteristica[]): CaracteristicaIds {
  const out: CaracteristicaIds = {}
  for (const [key, re, exclude] of CARAC_RULES) {
    const hit = caracts.find((c) => {
      const names = [c.id, ...(c.alias ?? [])].map(String)
      return names.some((n) => re.test(n) && !(exclude && exclude.test(n)))
    })
    if (hit && !Object.values(out).includes(hit.id)) out[key] = hit.id
  }
  return out
}

/** Most specific id from GET /v1/ubicaciones/latitud/../longitud/../countrycode/PA. */
export function pickUbicacion(ubicaciones: NaventUbicacion[]): string | null {
  let node = ubicaciones[0]
  if (!node) return null
  while (node.localidades && node.localidades.length > 0) node = node.localidades[0]
  return node.id ?? null
}

function images(p: NaventProperty, baseUrl: string): { urlImagenOriginal: string; titulo: string }[] {
  const raw = [p.main_image_url, ...(Array.isArray(p.gallery_urls) ? p.gallery_urls : [])]
  const seen = new Set<string>()
  const out: { urlImagenOriginal: string; titulo: string }[] = []
  for (const u of raw) {
    if (typeof u !== 'string' || !u.trim()) continue
    let abs: string
    try { abs = new URL(u, baseUrl).href } catch { continue }
    if (!/^https?:\/\//.test(abs) || seen.has(abs)) continue
    seen.add(abs)
    out.push({ urlImagenOriginal: abs, titulo: p.titulo.slice(0, 80) })
  }
  return out.slice(0, 30)
}

export function buildNaventAviso(p: NaventProperty, ctx: NaventContext) {
  const isRent = p.tipo === 'arriendo'
  const moneda = (p.iso_currency || 'USD').toUpperCase() === 'PAB' ? 'USD' : (p.iso_currency || 'USD').toUpperCase()
  const monto = isRent ? (p.rent_price ?? p.precio) : (p.sale_price ?? p.precio)
  const lat = num(p.latitude)
  const lng = num(p.longitude)

  const caracteristicas: { id: string; valor: string }[] = []
  const add = (id: string | undefined, v: number | null) => {
    if (id && v !== null && v > 0) caracteristicas.push({ id, valor: String(v) })
  }
  add(ctx.caracteristicas.dormitorios, p.bedrooms)
  add(ctx.caracteristicas.banos, p.bathrooms)
  add(ctx.caracteristicas.mediosBanos, p.half_bathrooms)
  add(ctx.caracteristicas.estacionamientos, p.garages)
  add(ctx.caracteristicas.areaTotal, num(p.area))
  add(ctx.caracteristicas.areaCubierta, num(p.built_area))

  const ubicacionTexto = [p.zona, p.ciudad, p.region_label].filter(Boolean).join(', ')

  return {
    codigoAviso: p.id,
    ...(p.reference ? { claveReferencia: p.reference } : {}),
    titulo: p.titulo.slice(0, 120),
    descripcion: (p.descripcion || p.titulo).slice(0, 5000),
    ...(ctx.tipo ? { tipoDePropiedad: { idTipo: ctx.tipo.idTipo, ...(ctx.tipo.tipo ? { tipo: ctx.tipo.tipo } : {}) } } : {}),
    precios: [{ moneda, monto: String(Math.round(Number(monto) || 0)), operacion: isRent ? ctx.operacionAlquiler : ctx.operacionVenta }],
    localizacion: {
      ...(p.address ? { direccion: p.address.slice(0, 200) } : {}),
      ...(ctx.idUbicacion ? { idUbicacion: ctx.idUbicacion } : {}),
      ...(ubicacionTexto ? { ubicacion: ubicacionTexto } : {}),
      // muestraMapa is left to the portal default: its allowed values aren't in
      // the public spec (GET /v1/informacion/aviso/localizacion lists them).
      ...(lat !== null && lng !== null ? { latitud: String(lat), longitud: String(lng) } : {}),
    },
    caracteristicas,
    multimedia: { imagenes: images(p, ctx.baseUrl) },
    publicador: {
      codigoInmobiliaria: ctx.codigoInmobiliaria,
      nombreDeContacto: ctx.contacto.nombre,
      ...(ctx.contacto.email ? { emailDeContacto: ctx.contacto.email } : {}),
      ...(ctx.contacto.telefono ? { telefonoDeContacto: ctx.contacto.telefono } : {}),
    },
    ...(ctx.plan ? { publicacion: { tipoDePublicacion: ctx.plan } } : {}),
  }
}

export type NaventAviso = ReturnType<typeof buildNaventAviso>

/** Stable hash of a payload (key-order independent) — skip unchanged re-sends. */
export function payloadHash(value: unknown): string {
  const stable = (v: unknown): string =>
    Array.isArray(v) ? `[${v.map(stable).join(',')}]`
    : v && typeof v === 'object' ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`
    : JSON.stringify(v)
  const s = stable(value)
  let h1 = 0x811c9dc5, h2 = 0x01000193
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

/** Navent mensaje fecha ("2026-11-18T10:22:00", "18/11/2026 10:22", epoch ms) → unix seconds. */
export function parseNaventDate(fecha: string | number | null | undefined): number {
  if (fecha === null || fecha === undefined || fecha === '') return 0
  if (typeof fecha === 'number') return fecha > 1e12 ? Math.floor(fecha / 1000) : fecha
  const dmy = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/)
  if (dmy) {
    const [, d, m, y, hh = '0', mm = '0'] = dmy
    return Math.floor(Date.UTC(+y, +m - 1, +d, +hh, +mm) / 1000)
  }
  const t = Date.parse(fecha)
  return Number.isFinite(t) ? Math.floor(t / 1000) : 0
}

/** yyyyMMdd (Navent fromDate format) for a date. */
export function naventDay(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
}
