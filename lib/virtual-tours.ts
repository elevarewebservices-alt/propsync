export type Hotspot = {
  id: string
  destination: string
  label: string
  x: number
  y: number
  yaw: number
  pitch: number
}
export type TourScene = {
  id: string
  name: string
  image: string
  thumbnail: string
  kind: 'photo' | 'panorama'
  space: string
  hotspots: Hotspot[]
}
export type TourDocument = {
  name: string
  slug: string
  description: string
  project: string
  property_id: string | null
  cover: string
  initial_scene_id: string
  scenes: TourScene[]
  cta: {
    type: 'whatsapp' | 'phone' | 'email' | 'form'
    value: string
    label: string
  }
}
export type VirtualTour = TourDocument & {
  id: string
  status: 'draft' | 'published' | 'unpublished'
  revision: number
  created_at: string
}
export type TourProperty = {
  titulo: string
  precio: number
  iso_currency?: string | null
  area: string | null
  bedrooms: number | null
  bathrooms: number | null
  descripcion: string | null
}
export type TourRow = {
  id: string
  company_id: string
  created_by: string
  property_id: string | null
  slug: string
  status: VirtualTour['status']
  document: TourDocument
  revision: number
  created_at: string
  updated_at: string
}
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}
export function emptyTour(): TourDocument {
  return {
    name: '',
    slug: '',
    description: '',
    project: '',
    property_id: null,
    cover: '',
    initial_scene_id: '',
    scenes: [],
    cta: { type: 'whatsapp', value: '', label: 'Hablar con un asesor' },
  }
}
export function assetUrl(tourId: string, image: string) {
  return image.startsWith('/tour-demo/')
    ? image
    : `/api/virtual-tours/${tourId}/assets/${image}`
}
export function ctaUrl(cta: TourDocument['cta'], name: string): string {
  if (!cta.value) return ''
  if (cta.type === 'whatsapp')
    return `https://wa.me/${cta.value.replace(/\D/g, '')}?text=${encodeURIComponent(`Quiero información sobre ${name}`)}`
  if (cta.type === 'phone') return `tel:${cta.value}`
  if (cta.type === 'email')
    return `mailto:${cta.value}?subject=${encodeURIComponent(name)}`
  return /^https:\/\//.test(cta.value) ? cta.value : ''
}
// Whitelist every persisted field; reject invalid graphs instead of silently losing links.
export function validateTour(input: unknown): TourDocument {
  const fail = (message: string): never => {
    throw new Error(message)
  }
  if (!input || typeof input !== 'object') fail('Datos de tour inválidos.')
  const d = input as TourDocument
  const str = (v: unknown, max: number, required = false): string =>
    typeof v === 'string' && v.length <= max && (!required || !!v.trim())
      ? v.trim()
      : fail('Revisa los campos del tour.')
  const id = (v: unknown) =>
    typeof v === 'string' && UUID.test(v) ? v : fail('Identificador inválido.')
  const image = (v: unknown) =>
    typeof v === 'string' && /^[0-9a-f-]{36}(-thumb)?\.webp$/.test(v)
      ? v
      : fail('Imagen inválida. Vuelve a subirla.')
  const number = (v: unknown, min: number, max: number): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
      ? v
      : fail('Posición de hotspot inválida.')
  const slug = str(d.slug, 80, true)
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug === 'demo' ||
    UUID.test(slug)
  )
    fail(
      'Usa un slug de letras minúsculas, números y guiones. “demo” está reservado.',
    )
  if (!Array.isArray(d.scenes) || d.scenes.length > 40)
    fail('Máximo 40 escenas por tour.')
  const scenes: TourScene[] = d.scenes.map((s: TourScene) => {
    if (
      !s ||
      !['photo', 'panorama'].includes(s.kind) ||
      !Array.isArray(s.hotspots) ||
      s.hotspots.length > 30
    )
      fail('Escena inválida.')
    return {
      id: id(s.id),
      name: str(s.name, 100, true),
      image: image(s.image),
      thumbnail: image(s.thumbnail),
      kind: s.kind,
      space: str(s.space, 80),
      hotspots: s.hotspots.map((h: Hotspot) => ({
        id: id(h.id),
        destination: id(h.destination),
        label: str(h.label, 100),
        x: number(h.x, 0, 1),
        y: number(h.y, 0, 1),
        yaw: number(h.yaw, -Math.PI * 2, Math.PI * 2),
        pitch: number(h.pitch, -Math.PI / 2, Math.PI / 2),
      })),
    }
  })
  const ids = new Set(scenes.map((s) => s.id))
  if (ids.size !== scenes.length) fail('Hay escenas duplicadas.')
  for (const scene of scenes) {
    if (new Set(scene.hotspots.map((h) => h.id)).size !== scene.hotspots.length)
      fail('Hay hotspots duplicados.')
    if (
      scene.hotspots.some(
        (h) => !ids.has(h.destination) || h.destination === scene.id,
      )
    )
      fail('Cada hotspot debe conectar con otra escena existente.')
  }
  const initial = scenes.length ? id(d.initial_scene_id) : ''
  if (scenes.length && !ids.has(initial)) fail('Selecciona la escena inicial.')
  const cover = d.cover ? image(d.cover) : ''
  if (cover && !scenes.some((s) => s.image === cover))
    fail('La portada debe pertenecer a una escena.')
  if (!d.cta || !['whatsapp', 'phone', 'email', 'form'].includes(d.cta.type))
    fail('CTA inválido.')
  const value = str(d.cta.value, 500)
  if (value) {
    if (
      ['phone', 'whatsapp'].includes(d.cta.type) &&
      !/^\+?[0-9 ()-]{7,25}$/.test(value)
    )
      fail('Escribe un teléfono con código de país.')
    if (
      d.cta.type === 'email' &&
      !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value)
    )
      fail('Email inválido.')
    if (d.cta.type === 'form') {
      try {
        const url = new URL(value)
        if (url.protocol !== 'https:' || url.username || url.password)
          fail('Usa un formulario con URL HTTPS.')
      } catch {
        fail('Usa un formulario con URL HTTPS.')
      }
    }
  }
  return {
    name: str(d.name, 150, true),
    slug,
    description: str(d.description, 3000),
    project: str(d.project, 150),
    property_id: d.property_id ? id(d.property_id) : null,
    cover,
    initial_scene_id: initial,
    scenes,
    cta: { type: d.cta.type, value, label: str(d.cta.label, 80, true) },
  }
}
