// node --test scripts/test-portal-feed.mjs
// Unit tests for the outbound portal XML feed serializer (lib/portal-feed.ts).
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

function load(path, requireMap = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  const req = (name) => {
    if (!(name in requireMap)) throw new Error(`unexpected require ${name}`)
    return requireMap[name]
  }
  new Function('module', 'exports', 'require', outputText)(module, module.exports, req)
  return module.exports
}

const canales = load('lib/canales.ts')
const feed = load('lib/portal-feed.ts', { './canales': canales })
const { buildPortalFeed, toNumber, escapeXml, isFeedPortal, propertyImages, FEED_PORTALS } = feed

const BASE = 'https://www.propsyncia.com'
const company = { id: 'c1', nombre: 'Inmobiliaria Ñandú & Hijos', email: 'info@x.com', telefono: '+507 6000-0000' }

const prop = (over = {}) => ({
  id: 'a0000000-0000-4000-8000-000000000001',
  reference: 'PS-001',
  titulo: 'Apto <lujo> en "Costa del Este" & vista',
  descripcion: 'Línea 1\nCDATA trap ]]> fin\u0008 y control',
  tipo: 'venta', for_sale: true, for_rent: false,
  property_type_label: 'Apartamento', property_condition_label: 'Usado',
  country_label: null, region_label: 'Panamá', ciudad: 'Panamá', zona: 'Costa del Este', address: 'Calle 1',
  latitude: '8.9936', longitude: '-79.4699',
  precio: 249900, iso_currency: 'usd', sale_price: null, rent_price: null, maintenance_fee: 250,
  area: '120,5', built_area: '1,250', bedrooms: 3, bathrooms: 2, half_bathrooms: 1, garages: 2, floor: '22', furnished: false,
  estado_publicacion: 'destacado',
  main_image_url: 'https://cdn.x.com/1.webp',
  gallery_urls: ['https://cdn.x.com/1.webp', 'https://cdn.x.com/2.webp', '/tour-demo/sala.webp', 'javascript:alert(1)'],
  video: null,
  features_internal: [{ id: 'piscina', nombre: 'Piscina' }], features_external: ['Gimnasio'],
  tour_rooms: [{ url: 'x', label: 'Sala' }],
  agente_asignado_id: 'ag1',
  created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-10T00:00:00Z',
  ...over,
})

const build = (properties, agents = new Map([['ag1', { nombre: 'Gizeh', email: 'g@x.com', telefono: '6111-1111' }]])) =>
  buildPortalFeed({ portal: 'encuentra24', baseUrl: BASE, company, properties, agents, generatedAt: new Date('2026-11-18T00:00:00Z') })

const parse = (xml) => new XMLParser({ ignoreAttributes: false, cdataPropName: false, parseTagValue: false }).parse(xml)

test('feed is well-formed XML even with hostile text', () => {
  const xml = build([prop()])
  assert.equal(XMLValidator.validate(xml), true)
  const doc = parse(xml).propsync_feed
  assert.equal(doc['@_total'], '1')
  assert.equal(doc.inmobiliaria.nombre, 'Inmobiliaria Ñandú & Hijos')
  const p = doc.propiedades.propiedad
  assert.equal(p.titulo, 'Apto <lujo> en "Costa del Este" & vista')
  assert.match(p.descripcion, /CDATA trap \]\]> fin y control/)
})

test('maps listing fields', () => {
  const p = parse(build([prop()])).propsync_feed.propiedades.propiedad
  assert.equal(p.operacion, 'venta')
  assert.equal(p.destacado, 'true')
  assert.equal(p.precio['#text'], '249900')
  assert.equal(p.precio['@_moneda'], 'USD')
  assert.equal(p.ubicacion.pais, 'Panamá')
  assert.equal(p.ubicacion.latitud, '8.9936')
  assert.equal(p.area_total['#text'], '120.5')
  assert.equal(p.area_construida['#text'], '1250')
  assert.deepEqual(p.caracteristicas.caracteristica, ['Piscina', 'Gimnasio'])
  assert.equal(p.tour_virtual, `${BASE}/tour/${prop().id}`)
  assert.equal(p.url, `${BASE}/p/${prop().id}`)
  assert.equal(p.contacto.agente, 'Gizeh')
  assert.equal(p.contacto.telefono, '6111-1111')
})

test('images: deduped, absolute, http(s) only, ordered', () => {
  assert.deepEqual(propertyImages(prop(), BASE), [
    'https://cdn.x.com/1.webp', 'https://cdn.x.com/2.webp', `${BASE}/tour-demo/sala.webp`,
  ])
})

test('rent listing + agency fallback contact', () => {
  const p = parse(build([prop({ tipo: 'arriendo', for_sale: false, for_rent: true, precio: 1800, agente_asignado_id: null })], new Map()))
    .propsync_feed.propiedades.propiedad
  assert.equal(p.operacion, 'alquiler')
  assert.equal(p.precio_alquiler['#text'], '1800')
  assert.equal(p.precio_alquiler['@_periodo'], 'mensual')
  assert.equal(p.precio_venta, undefined)
  assert.equal(p.contacto.email, 'info@x.com')
  assert.equal(p.contacto.telefono, '+507 6000-0000')
})

test('empty feed still valid', () => {
  const xml = build([])
  assert.equal(XMLValidator.validate(xml), true)
  assert.equal(parse(xml).propsync_feed['@_total'], '0')
})

test('helpers', () => {
  assert.equal(toNumber('85 m2'), 85)
  assert.equal(toNumber('1,250'), 1250)
  assert.equal(toNumber('120,5'), 120.5)
  assert.equal(toNumber(''), null)
  assert.equal(escapeXml('a&b<c'), 'a&amp;b&lt;c')
  assert.ok(isFeedPortal('encuentra24') && isFeedPortal('comprealquile') && isFeedPortal('todos'))
  assert.ok(!isFeedPortal('pagina_web') && !isFeedPortal('../etc'))
  assert.deepEqual(FEED_PORTALS.map((p) => p.id), ['comprealquile', 'encuentra24', 'todos'])
})
