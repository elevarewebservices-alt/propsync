'use client'

import { useEffect, useRef } from 'react'
import type { Property } from '@/lib/types'

interface PropertyMapProps {
  properties: Property[]
  onSelect: (property: Property) => void
}

function formatPrice(p: number) {
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(1)}M`
  if (p >= 1_000) return `$${(p / 1_000).toFixed(0)}K`
  return `$${p}`
}

export default function PropertyMap({ properties, onSelect }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamic import to avoid SSR issues
    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css' as any),
    ]).then(([L]) => {
      const Leaflet = L.default ?? L

      // Fix default icon paths broken by webpack
      delete (Leaflet.Icon.Default.prototype as any)._getIconUrl
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const withCoords = properties.filter(
        (p) => p.latitude && p.longitude && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude))
      )

      const defaultCenter: [number, number] = withCoords.length
        ? [Number(withCoords[0].latitude), Number(withCoords[0].longitude)]
        : [8.9936, -79.5197] // Panama City default

      const map = Leaflet.map(mapRef.current!, { zoomControl: true }).setView(defaultCenter, 13)

      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      withCoords.forEach((prop) => {
        const lat = Number(prop.latitude)
        const lng = Number(prop.longitude)
        const isDestacado = prop.estado_publicacion === 'destacado'

        const icon = Leaflet.divIcon({
          className: '',
          html: `<div style="
            background:${isDestacado ? '#f59e0b' : '#1a73e8'};
            color:white;
            padding:3px 7px;
            border-radius:12px;
            font-size:11px;
            font-weight:600;
            white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,.35);
            border:2px solid white;
            font-family:Inter,sans-serif;
          ">${formatPrice(prop.precio)}</div>`,
          iconAnchor: [0, 0],
        })

        const marker = Leaflet.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px;font-family:Inter,sans-serif">
              ${prop.imagenes[0] ? `<img src="${prop.imagenes[0]}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-bottom:6px" />` : ''}
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">${prop.titulo}</div>
              <div style="color:#6b7280;font-size:11px">${prop.ciudad ?? ''} · ${prop.tipo === 'venta' ? 'Venta' : 'Arriendo'}</div>
              <div style="font-weight:700;color:#1a73e8;margin-top:4px">${formatPrice(prop.precio)}</div>
              <button id="detail-${prop.id}" style="
                margin-top:8px;width:100%;padding:4px;background:#1a73e8;color:white;
                border:none;border-radius:6px;cursor:pointer;font-size:12px
              ">Ver detalle</button>
            </div>
          `)

        marker.on('popupopen', () => {
          setTimeout(() => {
            document.getElementById(`detail-${prop.id}`)?.addEventListener('click', () => {
              onSelect(prop)
            })
          }, 50)
        })
      })

      if (withCoords.length > 1) {
        const bounds = Leaflet.latLngBounds(withCoords.map((p) => [Number(p.latitude), Number(p.longitude)]))
        map.fitBounds(bounds, { padding: [40, 40] })
      }

      mapInstanceRef.current = map
    })

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers when properties change without recreating the map
  useEffect(() => {
    // Marker updates are handled on initial mount; re-mount handles prop changes
  }, [properties])

  return <div ref={mapRef} className="w-full h-full rounded-xl" />
}
