// Pure helpers for portal leads (Encuentra24 first). No I/O — tested by
// scripts/test-portal-leads.mjs. Ported from the standalone encuentra-wasi
// script (src/lib/normalize.js + src/phoneCountryMap.js) that ran this flow
// against Zoho for another client.

// Longest prefixes first so "+1" never shadows "+54".
const PHONE_COUNTRY_MAP: { prefix: string; country: string }[] = [
  { prefix: '+507', country: 'Panamá' },
  { prefix: '+506', country: 'Costa Rica' },
  { prefix: '+502', country: 'Guatemala' },
  { prefix: '+503', country: 'El Salvador' },
  { prefix: '+504', country: 'Honduras' },
  { prefix: '+505', country: 'Nicaragua' },
  { prefix: '+51', country: 'Perú' },
  { prefix: '+52', country: 'México' },
  { prefix: '+54', country: 'Argentina' },
  { prefix: '+55', country: 'Brasil' },
  { prefix: '+56', country: 'Chile' },
  { prefix: '+57', country: 'Colombia' },
  { prefix: '+58', country: 'Venezuela' },
  { prefix: '+34', country: 'España' },
  { prefix: '+1', country: 'Estados Unidos/Canadá' },
].sort((a, b) => b.prefix.length - a.prefix.length)

export function detectCountry(phone: string): string | null {
  if (!phone.startsWith('+')) return null
  return PHONE_COUNTRY_MAP.find((p) => phone.startsWith(p.prefix))?.country ?? null
}

/**
 * Encuentra24 sends numbers with the "00" international prefix ("00507 65506360");
 * normalize to E.164 ("+50765506360"). Local 8-digit Panamanian numbers get +507.
 */
export function cleanPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  if (trimmed.startsWith('+')) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.length === 8 && /^[2-9]/.test(digits)) return `+507${digits}`
  return digits
}

// Order matters: more specific first (a PH is often also called "apartamento").
const PROPERTY_TYPE_KEYWORDS: { type: string; pattern: RegExp }[] = [
  { type: 'PH', pattern: /\bPH\b|penthouse/i },
  { type: 'Dúplex', pattern: /d[uú]plex/i },
  { type: 'Casa', pattern: /casa/i },
  { type: 'Apartamento', pattern: /apartamento|apto\b/i },
  { type: 'Local Comercial', pattern: /local comercial|local\b/i },
  { type: 'Oficina', pattern: /oficina/i },
  { type: 'Terreno', pattern: /terreno|lote\b/i },
]

export function detectPropertyType(title: string | null | undefined): string {
  if (!title) return 'Otro'
  return PROPERTY_TYPE_KEYWORDS.find((k) => k.pattern.test(title))?.type ?? 'Otro'
}

export interface Encuentra24RawLead {
  id?: string | number
  title?: string
  status?: string
  created_at?: string | number
  contact?: { name?: string; email?: string; phone?: string }
}

export interface PortalLead {
  externalId: string
  /** When the portal tells us the exact listing (Compre o Alquile codigoAviso = our property id). */
  propertyId?: string | null
  /** Free-text message the person wrote, if the portal provides it. */
  mensaje?: string | null
  nombre: string
  email: string | null
  telefono: string | null
  pais: string | null
  tipoPropiedad: string
  tituloPropiedad: string
  status: string
  createdAt: number // unix seconds
}

export function normalizeEncuentra24Lead(raw: Encuentra24RawLead): PortalLead {
  const contact = raw.contact ?? {}
  const telefono = cleanPhone(contact.phone)
  const email = (contact.email ?? '').trim().toLowerCase()
  const titulo = (raw.title ?? '').trim()
  const nombre = (contact.name ?? '').trim() || email || telefono || 'Lead Encuentra24'
  return {
    externalId: String(raw.id ?? ''),
    nombre,
    email: email || null,
    telefono: telefono || null,
    pais: detectCountry(telefono),
    tipoPropiedad: detectPropertyType(titulo),
    tituloPropiedad: titulo,
    status: raw.status ?? '',
    createdAt: Number(raw.created_at) || 0,
  }
}

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normalizeTitle(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Find the listing a lead asked about. Encuentra24 leads carry the ad title,
 * which is normally the PropSync title (the feed publishes it verbatim).
 * Exact normalized match first, then containment either way (portals sometimes
 * truncate titles). Short titles never match by containment.
 */
export function matchPropertyByTitle<T extends { id: string; titulo: string }>(title: string, properties: T[]): T | null {
  const t = normalizeTitle(title)
  if (!t) return null
  const exact = properties.find((p) => normalizeTitle(p.titulo) === t)
  if (exact) return exact
  if (t.length < 12) return null
  return properties.find((p) => {
    const pt = normalizeTitle(p.titulo)
    return pt.length >= 12 && (pt.includes(t) || t.includes(pt))
  }) ?? null
}

/** Phone comparison key: digits only, last 8 (ignores +507 / 00507 / spaces). */
export function phoneKey(phone: string | null | undefined): string {
  const d = (phone ?? '').replace(/\D/g, '')
  return d.length >= 7 ? d.slice(-8) : ''
}
