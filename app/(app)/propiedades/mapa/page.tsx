'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { PropertyDetailSheet } from '@/components/propiedades/PropertyDetailSheet'
import { Property, EstadoPublicacion, Disponibilidad, EtapaCRM } from '@/lib/types'
import type { PropertyRow } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const PropertyMap = dynamic(() => import('@/components/propiedades/PropertyMap'), { ssr: false })

function rowToProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    wasi_id: row.wasi_id,
    titulo: row.titulo,
    descripcion: row.descripcion ?? '',
    address: row.address,
    reference: row.reference,
    tipo: row.tipo,
    for_sale: row.for_sale,
    for_rent: row.for_rent,
    for_transfer: row.for_transfer,
    property_type_label: row.property_type_label,
    property_condition_label: row.property_condition_label,
    country_label: row.country_label,
    region_label: row.region_label,
    ciudad: row.ciudad,
    zona: row.zona,
    latitude: row.latitude,
    longitude: row.longitude,
    zip_code: row.zip_code,
    floor: row.floor,
    precio: Number(row.precio),
    iso_currency: row.iso_currency,
    sale_price: row.sale_price ? Number(row.sale_price) : null,
    rent_price: row.rent_price ? Number(row.rent_price) : null,
    maintenance_fee: row.maintenance_fee ? Number(row.maintenance_fee) : null,
    rents_type_label: row.rents_type_label,
    area: row.area,
    built_area: row.built_area,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    half_bathrooms: row.half_bathrooms,
    garages: row.garages,
    furnished: row.furnished,
    building_date: row.building_date,
    estado_publicacion: (row.estado_publicacion ?? 'activo') as EstadoPublicacion,
    disponibilidad: (row.disponibilidad ?? 'disponible') as Disponibilidad,
    id_status_on_page: row.id_status_on_page,
    id_availability: row.id_availability,
    availability_label: row.availability_label,
    visits: row.visits,
    network_share: row.network_share,
    imagenes: row.main_image_url ? [row.main_image_url] : [],
    main_image: row.main_image_url ? { url: row.main_image_url } : null,
    galleries: Array.isArray(row.gallery_urls)
      ? (row.gallery_urls as string[]).map((url) => ({ url }))
      : [],
    video: row.video,
    features: {
      internal: Array.isArray(row.features_internal) ? (row.features_internal as { id: string; nombre: string }[]) : [],
      external: Array.isArray(row.features_external) ? (row.features_external as { id: string; nombre: string }[]) : [],
    },
    etapa_crm: (row.etapa_crm ?? 'prospecto') as EtapaCRM,
    cliente_nombre: row.cliente_nombre,
    cliente_email: row.cliente_email,
    agente_asignado: null,
    fecha_seguimiento: row.fecha_seguimiento,
    notas: row.notas,
    brevo_deal_id: row.brevo_deal_id,
    canalesPublicados: row.canales_publicados ?? [],
    whatsappEstado: (row.whatsapp_estado ?? 'no_contactado') as Property['whatsappEstado'],
    telefono_propietario: row.telefono_propietario ?? '',
    fuente: (row.fuente ?? 'manual') as Property['fuente'],
    fechaCreacion: row.created_at,
    updated_at: row.updated_at,
  }
}

export default function MapaPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const loadProperties = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/properties')
      if (res.ok) {
        const rows: PropertyRow[] = await res.json()
        setProperties(rows.map(rowToProperty))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadProperties() }, [loadProperties])

  const withCoords = properties.filter(
    (p) => p.latitude && p.longitude && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude))
  )
  const withoutCoords = properties.length - withCoords.length

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/propiedades">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <MapPin className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-base font-semibold text-foreground leading-none">Vista en mapa</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading ? 'Cargando…' : `${withCoords.length} propiedades con ubicación`}
              {!isLoading && withoutCoords > 0 && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  · {withoutCoords} sin coordenadas
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {withCoords.length} en mapa
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadProperties} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Cargando propiedades…
          </div>
        ) : withCoords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-8">
            <MapPin className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-semibold text-foreground">Sin coordenadas</p>
              <p className="text-sm text-muted-foreground mt-1">
                Las propiedades necesitan latitud y longitud para aparecer en el mapa.
                Sincroniza desde Wasi o agrega coordenadas manualmente.
              </p>
            </div>
          </div>
        ) : (
          <PropertyMap properties={withCoords} onSelect={setSelectedProperty} />
        )}
      </div>

      {/* Detail sheet */}
      <PropertyDetailSheet
        property={selectedProperty}
        open={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onSaved={(patch) => {
          if (!selectedProperty) return
          const updated = { ...selectedProperty, ...patch }
          setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          setSelectedProperty(updated)
        }}
      />
    </div>
  )
}
