// node --test scripts/test-navent-mapping.mjs
// Unit tests for PropSync → OpenNavent (Compre o Alquile) mapping.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'

const { outputText } = ts.transpileModule(readFileSync('lib/navent-mapping.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const module = { exports: {} }
new Function('module', 'exports', outputText)(module, module.exports)
const {
  buildNaventAviso, pickOperaciones, pickTipo, pickCaracteristicas, pickUbicacion, payloadHash, parseNaventDate, naventDay, num,
} = module.exports

const prop = (over = {}) => ({
  id: 'a0000000-0000-4000-8000-000000000001', reference: 'PS-001',
  titulo: 'Apartamento con vista al mar en Costa del Este', descripcion: 'Hermoso apartamento.',
  tipo: 'venta', property_type_label: 'Apartamento', precio: 425000, iso_currency: 'USD', sale_price: null, rent_price: null,
  address: 'Calle 1', zona: 'Costa del Este', ciudad: 'Panamá', region_label: 'Panamá', latitude: '8.9936', longitude: '-79.4699',
  bedrooms: 3, bathrooms: 2, half_bathrooms: null, garages: 2, area: '145', built_area: '1,250',
  main_image_url: 'https://cdn.x.com/1.webp', gallery_urls: ['https://cdn.x.com/1.webp', '/tour-demo/sala.webp', 'javascript:x'],
  ...over,
})
const ctx = (over = {}) => ({
  codigoInmobiliaria: 'propsync-abc', contacto: { nombre: 'Gizeh', email: 'g@x.com', telefono: '+50765506360' },
  operacionVenta: 'Venta', operacionAlquiler: 'Alquiler', tipo: { idTipo: '2', tipo: 'Apartamento' }, idUbicacion: 'V1-C-123',
  caracteristicas: { dormitorios: 'CFT1', banos: 'CFT2', estacionamientos: 'CFT7', areaTotal: 'CFS1', areaCubierta: 'CFS2' },
  plan: null, baseUrl: 'https://www.propsyncia.com', ...over,
})

test('buildNaventAviso maps a sale listing', () => {
  const a = buildNaventAviso(prop(), ctx())
  assert.equal(a.codigoAviso, prop().id)
  assert.equal(a.claveReferencia, 'PS-001')
  assert.deepEqual(a.precios, [{ moneda: 'USD', monto: '425000', operacion: 'Venta' }])
  assert.deepEqual(a.tipoDePropiedad, { idTipo: '2', tipo: 'Apartamento' })
  assert.equal(a.localizacion.idUbicacion, 'V1-C-123')
  assert.equal(a.localizacion.latitud, '8.9936')
  assert.equal(a.localizacion.ubicacion, 'Costa del Este, Panamá, Panamá')
  assert.deepEqual(a.caracteristicas, [
    { id: 'CFT1', valor: '3' }, { id: 'CFT2', valor: '2' }, { id: 'CFT7', valor: '2' }, { id: 'CFS1', valor: '145' }, { id: 'CFS2', valor: '1250' },
  ])
  assert.deepEqual(a.multimedia.imagenes.map((i) => i.urlImagenOriginal), ['https://cdn.x.com/1.webp', 'https://www.propsyncia.com/tour-demo/sala.webp'])
  assert.equal(a.publicador.codigoInmobiliaria, 'propsync-abc')
  assert.equal(a.publicacion, undefined)
})

test('rent listing, PAB, no coords, plan, missing type', () => {
  const a = buildNaventAviso(prop({ tipo: 'arriendo', precio: 1800, iso_currency: 'PAB', latitude: null, longitude: null }),
    ctx({ tipo: null, idUbicacion: null, plan: 'Simple' }))
  assert.deepEqual(a.precios, [{ moneda: 'USD', monto: '1800', operacion: 'Alquiler' }])
  assert.equal(a.tipoDePropiedad, undefined)
  assert.equal(a.localizacion.latitud, undefined)
  assert.equal(a.localizacion.idUbicacion, undefined)
  assert.deepEqual(a.publicacion, { tipoDePublicacion: 'Simple' })
})

test('pickOperaciones uses the portal spelling, ignores temporary rent', () => {
  assert.deepEqual(pickOperaciones(['VENTA', 'ALQUILER TEMPORAL', 'ALQUILER']), { venta: 'VENTA', alquiler: 'ALQUILER' })
  assert.deepEqual(pickOperaciones([]), { venta: 'Venta', alquiler: 'Alquiler' })
})

test('pickTipo with synonyms (Apartamento↔Departamento, PH, Lote↔Terreno)', () => {
  const tipos = [{ id: '1', categoria: 'Casa' }, { id: '2', categoria: 'Departamento' }, { id: '3', categoria: 'Terreno' }, { id: '4', categoria: 'Local comercial' }]
  assert.deepEqual(pickTipo('Apartamento', tipos), { idTipo: '2', tipo: 'Departamento' })
  assert.deepEqual(pickTipo('PH', tipos), { idTipo: '2', tipo: 'Departamento' })
  assert.deepEqual(pickTipo('Lote', tipos), { idTipo: '3', tipo: 'Terreno' })
  assert.deepEqual(pickTipo('Local Comercial', tipos), { idTipo: '4', tipo: 'Local comercial' })
  assert.equal(pickTipo('Hangar', tipos), null)
  assert.equal(pickTipo(null, tipos), null)
})

test('pickCaracteristicas by id/alias, medio baño not taken as baño', () => {
  const ids = pickCaracteristicas([
    { id: 'CFT100', alias: ['Medio baño'] },
    { id: 'CFT2', alias: ['Baños'] },
    { id: 'CFT1', alias: ['Recámaras', 'Dormitorios'] },
    { id: 'CFT7', alias: ['Estacionamientos'] },
    { id: 'CFS1', alias: ['Superficie total'] },
    { id: 'CFS2', alias: ['Superficie cubierta'] },
  ])
  assert.deepEqual(ids, { mediosBanos: 'CFT100', dormitorios: 'CFT1', banos: 'CFT2', estacionamientos: 'CFT7', areaTotal: 'CFS1', areaCubierta: 'CFS2' })
})

test('pickUbicacion takes the most specific level', () => {
  assert.equal(pickUbicacion([{ id: 'PA', localidades: [{ id: 'PA-PAN', localidades: [{ id: 'PA-PAN-CDE' }] }] }]), 'PA-PAN-CDE')
  assert.equal(pickUbicacion([]), null)
})

test('payloadHash is key-order independent and change-sensitive', () => {
  assert.equal(payloadHash({ a: 1, b: [1, 2] }), payloadHash({ b: [1, 2], a: 1 }))
  assert.notEqual(payloadHash({ a: 1 }), payloadHash({ a: 2 }))
})

test('dates and numbers', () => {
  assert.equal(parseNaventDate('18/11/2026 10:22'), Date.UTC(2026, 10, 18, 10, 22) / 1000)
  assert.equal(parseNaventDate('2026-11-18T10:22:00Z'), Date.UTC(2026, 10, 18, 10, 22) / 1000)
  assert.equal(parseNaventDate(1786997051000), 1786997051)
  assert.equal(parseNaventDate(''), 0)
  assert.equal(naventDay(new Date(Date.UTC(2026, 0, 5))), '20260105')
  assert.equal(num('85 m2'), 85)
  assert.equal(num('1,250'), 1250)
})
