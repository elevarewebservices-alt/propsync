// node --test scripts/test-portal-leads.mjs
// Unit tests for portal-lead normalization (lib/portal-leads.ts).
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'

const { outputText } = ts.transpileModule(readFileSync('lib/portal-leads.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const module = { exports: {} }
new Function('module', 'exports', outputText)(module, module.exports)
const { cleanPhone, detectCountry, detectPropertyType, normalizeEncuentra24Lead, matchPropertyByTitle, normalizeTitle, phoneKey } = module.exports

test('cleanPhone: Encuentra24 00-prefix, +, local Panama, junk', () => {
  assert.equal(cleanPhone('00507 6550 6360'), '+50765506360')
  assert.equal(cleanPhone('+507 6550-6360'), '+50765506360')
  assert.equal(cleanPhone('6550-6360'), '+50765506360')
  assert.equal(cleanPhone('  '), '')
  assert.equal(cleanPhone(null), '')
})

test('detectCountry: longest prefix wins', () => {
  assert.equal(detectCountry('+50765506360'), 'Panamá')
  assert.equal(detectCountry('+5491122334455'), 'Argentina')
  assert.equal(detectCountry('+13055551234'), 'Estados Unidos/Canadá')
  assert.equal(detectCountry('65506360'), null)
})

test('detectPropertyType: specific before generic', () => {
  assert.equal(detectPropertyType('PH en Punta Pacífica con vista'), 'PH')
  assert.equal(detectPropertyType('Apartamento dúplex en Costa del Este'), 'Dúplex')
  assert.equal(detectPropertyType('Casa en Clayton'), 'Casa')
  assert.equal(detectPropertyType('Lote en Coronado'), 'Terreno')
  assert.equal(detectPropertyType(''), 'Otro')
})

test('normalizeEncuentra24Lead from the API shape', () => {
  const lead = normalizeEncuentra24Lead({
    id: 98765, title: 'Apartamento en venta en Costa del Este', status: 'new', created_at: '1786997051',
    contact: { name: ' María Pérez ', email: 'MARIA@Example.com ', phone: '00507 6550 6360' },
  })
  assert.deepEqual(lead, {
    externalId: '98765', nombre: 'María Pérez', email: 'maria@example.com', telefono: '+50765506360',
    pais: 'Panamá', tipoPropiedad: 'Apartamento', tituloPropiedad: 'Apartamento en venta en Costa del Este',
    status: 'new', createdAt: 1786997051,
  })
  // No name → falls back to email, then phone
  assert.equal(normalizeEncuentra24Lead({ id: 1, contact: { email: 'a@b.com' } }).nombre, 'a@b.com')
  assert.equal(normalizeEncuentra24Lead({ id: 2, contact: {} }).nombre, 'Lead Encuentra24')
})

test('matchPropertyByTitle: exact (accent/case-insensitive), containment, no false hits', () => {
  const props = [
    { id: 'a', titulo: 'Apartamento con vista al mar en Costa del Este' },
    { id: 'b', titulo: 'Casa en Clayton' },
  ]
  assert.equal(matchPropertyByTitle('APARTAMENTO CON VISTA AL MAR EN COSTA DEL ESTE', props)?.id, 'a')
  assert.equal(matchPropertyByTitle('Apartamento con vista al mar en Costa del Este - Ref 123', props)?.id, 'a')
  assert.equal(matchPropertyByTitle('Casa en Clayton', props)?.id, 'b')
  assert.equal(matchPropertyByTitle('Casa', props), null)
  assert.equal(matchPropertyByTitle('Oficina en Obarrio', props), null)
  assert.equal(normalizeTitle('Dúplex, ¡Nuevo!'), 'duplex nuevo')
})

test('phoneKey ignores prefixes and formatting', () => {
  assert.equal(phoneKey('+507 6550-6360'), phoneKey('00507 65506360'))
  assert.equal(phoneKey('6550-6360'), '65506360')
  assert.equal(phoneKey('123'), '')
})
