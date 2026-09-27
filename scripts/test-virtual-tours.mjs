import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'

const compiled = ts.transpileModule(
  readFileSync('lib/virtual-tours.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
)
const module = { exports: {} }
new Function('module', 'exports', compiled.outputText)(module, module.exports)
const { validateTour, emptyTour, ctaUrl, slugify } = module.exports
const id = 'a0000000-0000-4000-8000-000000000001'
const other = 'a0000000-0000-4000-8000-000000000002'
const image = `${id}.webp`
const make = () => ({
  ...emptyTour(),
  name: 'Apartamento 2203',
  slug: 'blur-2203',
  cover: image,
  initial_scene_id: id,
  scenes: [id, other].map((key, index) => ({
    id: key,
    name: index ? 'Cocina' : 'Sala',
    image,
    thumbnail: `${id}-thumb.webp`,
    kind: 'photo',
    space: 'Otro',
    hotspots: index
      ? []
      : [
          {
            id,
            destination: other,
            label: 'Cocina',
            x: 0.3,
            y: 0.8,
            yaw: 0,
            pitch: 0,
          },
        ],
  })),
})
test('preserves a valid scene graph and strips administrative fields', () => {
  const result = validateTour({
    ...make(),
    company_id: 'attacker',
    created_by: 'attacker',
    status: 'published',
  })
  assert.equal(result.scenes[0].hotspots[0].destination, other)
  assert.equal(result.company_id, undefined)
  assert.equal(result.status, undefined)
})
test('permits an empty draft', () =>
  assert.equal(
    validateTour({ ...emptyTour(), name: 'Test', slug: 'test' }).scenes.length,
    0,
  ))
for (const [name, change] of [
  [
    'reserved demo slug',
    (d) => {
      d.slug = 'demo'
    },
  ],
  [
    'legacy UUID route collision',
    (d) => {
      d.slug = id
    },
  ],
  [
    'unsafe slug',
    (d) => {
      d.slug = '../private'
    },
  ],
  [
    'external image injection',
    (d) => {
      d.scenes[0].image = 'https://attacker.test/pixel'
    },
  ],
  [
    'storage traversal',
    (d) => {
      d.scenes[0].image = '../secret.webp'
    },
  ],
  [
    'deleted destination',
    (d) => {
      d.scenes.pop()
    },
  ],
  [
    'self connection',
    (d) => {
      d.scenes[0].hotspots[0].destination = id
    },
  ],
  [
    'duplicate scene IDs',
    (d) => {
      d.scenes[1].id = id
    },
  ],
  [
    'duplicate hotspot IDs',
    (d) => {
      d.scenes[0].hotspots.push({ ...d.scenes[0].hotspots[0] })
    },
  ],
  [
    'invalid initial scene',
    (d) => {
      d.initial_scene_id = 'a0000000-0000-4000-8000-000000000099'
    },
  ],
  [
    'out of bounds position',
    (d) => {
      d.scenes[0].hotspots[0].x = 1.5
    },
  ],
  [
    'nonfinite position',
    (d) => {
      d.scenes[0].hotspots[0].pitch = Infinity
    },
  ],
  [
    'script CTA',
    (d) => {
      d.cta = { type: 'form', value: 'javascript:alert(1)', label: 'Abrir' }
    },
  ],
  [
    'email header injection',
    (d) => {
      d.cta = {
        type: 'email',
        value: 'a@b.com?bcc=other@c.com',
        label: 'Abrir',
      }
    },
  ],
  [
    'unknown viewer adapter',
    (d) => {
      d.scenes[0].kind = 'nerf'
    },
  ],
  [
    'unbounded scene count',
    (d) => {
      d.scenes = Array(41).fill(d.scenes[0])
    },
  ],
])
  test(`rejects ${name}`, () => {
    const d = make()
    change(d)
    assert.throws(() => validateTour(d))
  })
test('normalizes Spanish names for links', () =>
  assert.equal(slugify('Ático · Panamá 2203'), 'atico-panama-2203'))
test('encodes commercial CTA parameters', () => {
  const url = ctaUrl(
    { type: 'whatsapp', value: '+507 6000-1234', label: 'Consultar' },
    'Apartamento & balcón',
  )
  assert.match(url, /^https:\/\/wa.me\/50760001234\?text=/)
  assert.ok(url.includes('%26'))
})
