/**
 * Shared contract between the XML import wizard (client) and the import API
 * (server). The wizard does the XML parsing — the browser already ships a
 * DOMParser, so no XML dependency is needed anywhere — and posts plain rows
 * keyed by these field names. The server re-validates everything.
 */

export interface ImportableField {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean'
  required?: boolean
  /** Lowercase substrings used to auto-guess a mapping from the XML tag name. */
  hints: string[]
}

export const IMPORTABLE_PROPERTY_FIELDS: ImportableField[] = [
  { key: 'titulo',       label: 'Título',            type: 'text',   required: true,  hints: ['titulo', 'title', 'nombre', 'name', 'headline'] },
  { key: 'descripcion',  label: 'Descripción',       type: 'text',                    hints: ['descripcion', 'description', 'detalle', 'observaciones', 'body'] },
  { key: 'precio',       label: 'Precio',            type: 'number', required: true,  hints: ['precio', 'price', 'valor', 'amount', 'saleprice'] },
  { key: 'tipo',         label: 'Operación',         type: 'text',                    hints: ['operacion', 'operation', 'tipooperacion', 'transaction'] },
  // No bare 'id' hint: it hits inside unrelated words ("m2_construidos").
  { key: 'reference',    label: 'Referencia / código', type: 'text',                  hints: ['referencia', 'reference', 'codigo', 'code', 'ref'] },
  { key: 'address',      label: 'Dirección',         type: 'text',                    hints: ['direccion', 'address', 'calle', 'street'] },
  { key: 'ciudad',       label: 'Ciudad',            type: 'text',                    hints: ['ciudad', 'city', 'localidad', 'municipio'] },
  { key: 'zona',         label: 'Zona / barrio',     type: 'text',                    hints: ['zona', 'barrio', 'sector', 'neighborhood', 'neighbourhood', 'district'] },
  { key: 'region_label', label: 'Provincia / región', type: 'text',                   hints: ['provincia', 'region', 'estado', 'state', 'departamento'] },
  { key: 'country_label',label: 'País',              type: 'text',                    hints: ['pais', 'country'] },
  { key: 'zip_code',     label: 'Código postal',     type: 'text',                    hints: ['codigopostal', 'zip', 'postal', 'cp'] },
  { key: 'latitude',     label: 'Latitud',           type: 'text',                    hints: ['latitud', 'latitude', 'lat'] },
  { key: 'longitude',    label: 'Longitud',          type: 'text',                    hints: ['longitud', 'longitude', 'lng', 'lon'] },
  { key: 'bedrooms',     label: 'Habitaciones',      type: 'number',                  hints: ['habitaciones', 'recamaras', 'dormitorios', 'bedrooms', 'rooms', 'cuartos'] },
  { key: 'bathrooms',    label: 'Baños',             type: 'number',                  hints: ['banos', 'banios', 'bathrooms', 'baths'] },
  { key: 'garages',      label: 'Estacionamientos',  type: 'number',                  hints: ['garaje', 'garages', 'parking', 'estacionamiento', 'cocheras'] },
  { key: 'area',         label: 'Área total',        type: 'text',                    hints: ['areatotal', 'area', 'superficie', 'metros', 'surface', 'size', 'm2'] },
  { key: 'built_area',   label: 'Área construida',   type: 'text',                    hints: ['areaconstruida', 'construid', 'builtarea', 'covered'] },
  { key: 'main_image_url', label: 'Imagen principal', type: 'text',                   hints: ['imagen', 'image', 'foto', 'photo', 'picture', 'thumbnail', 'url'] },
  { key: 'property_type_label', label: 'Tipo de inmueble', type: 'text',              hints: ['tipoinmueble', 'tipopropiedad', 'propertytype', 'tipo'] },
  { key: 'owner',        label: 'Propietario',       type: 'text',                    hints: ['propietario', 'owner', 'dueno'] },
  { key: 'furnished',    label: 'Amoblado',          type: 'boolean',                 hints: ['amoblado', 'amueblado', 'furnished'] },
]

export const REQUIRED_FIELD_KEYS = IMPORTABLE_PROPERTY_FIELDS.filter((f) => f.required).map((f) => f.key)

/** A single parsed record, already mapped to PropSync field names. */
export type ImportRow = Record<string, string>

// ─── XML feed parsing ────────────────────────────────────────────────────────
// Runs in the browser: DOMParser is a platform built-in, so importing XML needs
// no XML library on either side. The server only ever sees mapped plain rows.

export interface ParsedFeed {
  recordTag: string
  fields: string[]
  records: Record<string, string>[]
}

/**
 * Flatten one record element into `path -> text` pairs. Nested tags become
 * `parent/child`, attributes become `tag@attr`, and repeated siblings are
 * joined with " | " so a list of image URLs still yields a usable value.
 */
export function flattenRecord(el: Element): Record<string, string> {
  const out: Record<string, string> = {}
  const put = (key: string, value: string) => {
    const v = value.trim()
    if (!v) return
    out[key] = out[key] ? `${out[key]} | ${v}` : v
  }

  const walk = (node: Element, prefix: string) => {
    for (const attr of Array.from(node.attributes)) {
      put(`${prefix}@${attr.name}`, attr.value)
    }
    const children = Array.from(node.children)
    if (children.length === 0) {
      put(prefix, node.textContent ?? '')
      return
    }
    for (const child of children) {
      walk(child, prefix ? `${prefix}/${child.tagName}` : child.tagName)
    }
  }

  for (const attr of Array.from(el.attributes)) put(`@${attr.name}`, attr.value)
  for (const child of Array.from(el.children)) walk(child, child.tagName)
  return out
}

/**
 * Find the element that repeats — that's the listing record. Feeds disagree on
 * naming (<property>, <inmueble>, <listing>, <item>…), so rather than a
 * hardcoded list we take the tag with the most same-parent siblings that
 * actually carry sub-fields. The "carries sub-fields" test is what stops a
 * repeated <caracteristica> leaf inside each listing from winning.
 */
export function detectRecordNodes(doc: Document): { tag: string; nodes: Element[] } | null {
  let best: { tag: string; nodes: Element[] } | null = null

  const visit = (parent: Element | Document) => {
    const byTag = new Map<string, Element[]>()
    for (const child of Array.from(parent.children)) {
      const list = byTag.get(child.tagName) ?? []
      list.push(child)
      byTag.set(child.tagName, list)
    }
    for (const [tag, nodes] of Array.from(byTag.entries())) {
      const hasChildren = nodes.some((n) => n.children.length > 0)
      if (hasChildren && (!best || nodes.length > best.nodes.length)) {
        best = { tag, nodes }
      }
      for (const n of nodes) visit(n)
    }
  }

  visit(doc)
  return best
}

/** Parse raw XML text into records + the field paths they contain. */
export function parseXmlFeed(text: string): { feed: ParsedFeed } | { error: string } {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) {
    return { error: 'El archivo no es XML válido. Revisa que no esté truncado o que no sea en realidad un CSV.' }
  }

  const found = detectRecordNodes(doc)
  if (!found || found.nodes.length === 0) {
    return { error: 'No se encontraron propiedades repetidas en el XML. ¿Es un feed de listados?' }
  }

  const records = found.nodes.map(flattenRecord)
  const fields = Array.from(new Set(records.flatMap((r) => Object.keys(r)))).sort()

  // A listing always carries several fields. Requiring more than one rejects
  // the degenerate case where the only repeating thing in the document is a
  // bare leaf, which would otherwise be reported as "1 propiedad encontrada".
  if (fields.length < 2) {
    return { error: 'No se encontraron propiedades repetidas en el XML. ¿Es un feed de listados?' }
  }

  return { feed: { recordTag: found.tag, fields, records } }
}

/**
 * Repeated sibling tags are joined with " | " by flattenRecord. That's right
 * for a gallery, wrong for a column that holds a single URL — take the first.
 */
export function firstValue(raw: string): string {
  return raw.split(' | ')[0].trim()
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-z0-9]/g, '')
}

function matchScore(xmlField: string, field: ImportableField): number {
  const n = normalize(xmlField.split('/').pop() ?? xmlField)
  if (!n) return 0
  let best = 0
  for (const hint of field.hints) {
    if (n === hint) return 3
    if (n.startsWith(hint) || n.endsWith(hint)) best = Math.max(best, 2)
    else if (n.includes(hint)) best = Math.max(best, 1)
  }
  return best
}

/**
 * Best-guess mapping from the XML's own tag names to PropSync fields.
 *
 * Strongest matches are claimed first, across all fields — not field by field
 * in declaration order. That ordering matters: a weak substring hit ("m2_
 * construidos" contains "id") would otherwise let an earlier field steal a tag
 * that a later field matches exactly.
 */
export function guessMapping(xmlFields: string[]): Record<string, string> {
  const candidates: { fieldKey: string; xmlField: string; score: number }[] = []
  for (const field of IMPORTABLE_PROPERTY_FIELDS) {
    for (const xmlField of xmlFields) {
      const score = matchScore(xmlField, field)
      if (score > 0) candidates.push({ fieldKey: field.key, xmlField, score })
    }
  }
  candidates.sort((a, b) => b.score - a.score)

  const mapping: Record<string, string> = {}
  const takenTags = new Set<string>()
  for (const c of candidates) {
    if (mapping[c.fieldKey] || takenTags.has(c.xmlField)) continue
    mapping[c.fieldKey] = c.xmlField
    takenTags.add(c.xmlField)
  }
  return mapping
}

/**
 * Money as feeds actually write it: "US$ 185,000.00", "185.000", "1.250.000,50".
 * Both separators are ambiguous on their own, so the last one is treated as a
 * decimal point only when it can't be a thousands separator — i.e. when the
 * other separator is also present, or when it isn't followed by exactly three
 * digits. "185.000" is therefore 185000, not 185.
 */
export function parsePrice(raw: string): number | null {
  if (!raw) return null
  // Anchor on the first digit so a currency symbol's own punctuation is dropped
  // — Panama writes balboas as "B/. 249,900", and a leading "." read as a
  // decimal point turned that into 249.9.
  const matched = firstValue(raw).replace(/[^\d.,-]/g, '').match(/-?\d[\d.,]*/)
  if (!matched) return null
  const cleaned = matched[0]

  const lastSep = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'))
  if (lastSep === -1) {
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }

  const sepChar = cleaned[lastSep]
  const otherChar = sepChar === '.' ? ',' : '.'
  const tail = cleaned.slice(lastSep + 1)
  const sameCount = cleaned.split(sepChar).length - 1

  const isDecimal = cleaned.includes(otherChar)
    ? true                       // "185,000.00" — mixed separators, last one wins
    : sameCount > 1
      ? false                    // "1.250.000" — repeated, so it's grouping
      : tail.length !== 3        // "185.000" grouping vs "185.5" decimal

  const digitsOnly = (s: string) => s.replace(/[.,]/g, '')
  const normalized = isDecimal
    ? `${digitsOnly(cleaned.slice(0, lastSep))}.${digitsOnly(tail)}`
    : digitsOnly(cleaned)

  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

export function parseIntOrNull(raw: string): number | null {
  if (!raw) return null
  // firstValue matters here: "3 | 4" from repeated tags would otherwise
  // concatenate into 34.
  const n = parseInt(firstValue(raw).replace(/[^\d-]/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

export function parseBool(raw: string): boolean | null {
  if (!raw) return null
  const v = firstValue(raw).toLowerCase()
  if (['1', 'true', 'si', 'sí', 'yes', 'y', 's'].includes(v)) return true
  if (['0', 'false', 'no', 'n'].includes(v)) return false
  return null
}

/** Feed values like "venta" / "for sale" / "alquiler" → PropSync's `tipo`. */
export function parseOperacion(raw: string): 'venta' | 'arriendo' | null {
  if (!raw) return null
  const v = normalize(raw)
  if (v.includes('alquil') || v.includes('rent') || v.includes('arriend') || v.includes('lease')) return 'arriendo'
  if (v.includes('venta') || v.includes('sale') || v.includes('sell') || v.includes('vender')) return 'venta'
  return null
}
