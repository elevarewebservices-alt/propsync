import type { VirtualTour, TourProperty } from './virtual-tours'
const names = ['Sala', 'Cocina', 'Habitación principal', 'Balcón']
export const demoTour: VirtualTour = {
  id: 'demo',
  name: 'Un hogar frente al mar',
  slug: 'demo',
  project: 'Residencia del Pacífico · Demo',
  description:
    'Explora cuatro espacios de un apartamento ilustrativo. Imágenes generadas con IA para demostrar PropSync Virtual Tour; no representan una propiedad en venta.',
  property_id: null,
  cover: '/tour-demo/sala.webp',
  initial_scene_id: 'scene-0',
  status: 'published',
  revision: 1,
  created_at: '2026-09-27T00:00:00Z',
  cta: {
    type: 'form',
    value: 'https://propsyncia.com',
    label: 'Conocer PropSync',
  },
  scenes: ['sala', 'cocina', 'habitacion', 'balcon'].map((key, i) => ({
    id: `scene-${i}`,
    name: names[i],
    space: names[i],
    image: `/tour-demo/${key}.webp`,
    thumbnail: `/tour-demo/${key}-thumb.webp`,
    kind: 'photo',
    hotspots: [
      {
        id: `next-${i}`,
        destination: `scene-${(i + 1) % 4}`,
        label: `Ir a ${names[(i + 1) % 4].toLowerCase()}`,
        x: 0.73,
        y: 0.55,
        yaw: 0,
        pitch: 0,
      },
      {
        id: `back-${i}`,
        destination: `scene-${(i + 3) % 4}`,
        label: names[(i + 3) % 4],
        x: 0.22,
        y: 0.63,
        yaw: 0,
        pitch: 0,
      },
    ],
  })),
}
export const demoProperty: TourProperty = {
  titulo: 'Apartamento ilustrativo · No disponible para venta',
  precio: 425000,
  iso_currency: 'USD',
  area: '145',
  bedrooms: 2,
  bathrooms: 2,
  descripcion:
    'Datos de ejemplo para la presentación comercial. Sala abierta, cocina, habitación y balcón frente al océano.',
}
