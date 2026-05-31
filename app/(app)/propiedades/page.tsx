'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PropertyCard } from '@/components/propiedades/PropertyCard'
import { PropertyFilters, PropertyFilterState, DEFAULT_FILTERS } from '@/components/propiedades/PropertyFilters'
import { PropertyDetailSheet } from '@/components/propiedades/PropertyDetailSheet'
import { EmptyState } from '@/components/shared/EmptyState'
import { Property, EstadoPublicacion, Disponibilidad, EtapaCRM } from '@/lib/types'
import { Home, RefreshCw, Download, Plus, Map } from 'lucide-react'
import Link from 'next/link'
import type { PropertyRow } from '@/lib/database.types'

const TABS: { value: EstadoPublicacion | 'todas'; label: string }[] = [
  { value: 'todas',     label: 'Todas' },
  { value: 'activo',    label: 'Activas' },
  { value: 'destacado', label: 'Destacadas' },
  { value: 'inactivo',  label: 'Inactivas' },
]

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

export default function PropiedadesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [agents, setAgents] = useState<{ id: string; nombre: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [filters, setFilters] = useState<PropertyFilterState>(DEFAULT_FILTERS)
  const [activeTab, setActiveTab] = useState<EstadoPublicacion | 'todas'>('todas')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const loadProperties = useCallback(async () => {
    setIsLoading(true)
    try {
      const [propsRes, agentsRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/agents'),
      ])
      if (propsRes.ok) {
        const rows: PropertyRow[] = await propsRes.json()
        setProperties(rows.map(rowToProperty))
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents((data as { id: string; nombre: string }[]).map(a => ({ id: a.id, nombre: a.nombre })))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProperties()
  }, [loadProperties])

  async function handleWasiSync() {
    setIsSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/wasi/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      setSyncMessage(data.message ?? (res.ok ? 'Sincronizado' : data.error))
      if (res.ok) await loadProperties()
    } catch {
      setSyncMessage('Error de conexión')
    } finally {
      setIsSyncing(false)
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  const filtered = properties.filter((p) => {
    if (activeTab !== 'todas' && p.estado_publicacion !== activeTab) return false

    const q = filters.search.toLowerCase()
    if (q && !p.titulo.toLowerCase().includes(q) &&
        !(p.zona ?? '').toLowerCase().includes(q) &&
        !(p.descripcion ?? '').toLowerCase().includes(q) &&
        !(p.address ?? '').toLowerCase().includes(q)) return false

    if (filters.wasiCode && !(p.wasi_id ?? '').toString().includes(filters.wasiCode)) return false

    if (filters.tipo === 'venta' && !p.for_sale) return false
    if (filters.tipo === 'arriendo' && !p.for_rent) return false

    if (filters.propertyType && p.property_type_label !== filters.propertyType) return false
    if (filters.ciudad && p.ciudad !== filters.ciudad) return false
    if (filters.zona && p.zona !== filters.zona) return false
    if (filters.disponibilidad && p.disponibilidad !== filters.disponibilidad) return false
    if (filters.etapaCrm && p.etapa_crm !== filters.etapaCrm) return false

    if (filters.precioMin && Number(p.precio) < Number(filters.precioMin)) return false
    if (filters.precioMax && Number(p.precio) > Number(filters.precioMax)) return false

    const area = Number(p.area ?? 0)
    if (filters.areaMin && area < Number(filters.areaMin)) return false
    if (filters.areaMax && area > Number(filters.areaMax)) return false

    if (filters.bedrooms) {
      const min = filters.bedrooms.endsWith('+') ? parseInt(filters.bedrooms) : Number(filters.bedrooms)
      const beds = p.bedrooms ?? 0
      if (filters.bedrooms.endsWith('+') ? beds < min : beds !== min) return false
    }
    if (filters.bathrooms) {
      const min = filters.bathrooms.endsWith('+') ? parseInt(filters.bathrooms) : Number(filters.bathrooms)
      const baths = p.bathrooms ?? 0
      if (filters.bathrooms.endsWith('+') ? baths < min : baths !== min) return false
    }
    if (filters.garages) {
      const min = filters.garages.endsWith('+') ? parseInt(filters.garages) : Number(filters.garages)
      const g = p.garages ?? 0
      if (filters.garages.endsWith('+') ? g < min : g !== min) return false
    }

    if (filters.yearBuilt && Number(p.building_date ?? 0) < Number(filters.yearBuilt)) return false

    if (filters.agente && (p.agente_asignado ?? '') !== filters.agente) return false

    return true
  })

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propiedades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? 'Cargando…' : `${properties.length} propiedades en tu inventario`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {syncMessage && (
            <span className="text-xs text-muted-foreground">{syncMessage}</span>
          )}
          <Link href="/propiedades/mapa">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Map className="h-3.5 w-3.5" /> Mapa
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleWasiSync}
            disabled={isSyncing}
          >
            {isSyncing
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <Download className="h-3.5 w-3.5" />
            }
            {isSyncing ? 'Importando…' : 'Importar Wasi'}
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            onClick={() => router.push('/propiedades/nueva')}
          >
            <Plus className="h-3.5 w-3.5" /> Nueva
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EstadoPublicacion | 'todas')}>
        <TabsList className="h-auto gap-1">
          {TABS.map((tab) => {
            const count =
              tab.value === 'todas'
                ? properties.length
                : properties.filter((p) => p.estado_publicacion === tab.value).length
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {count}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      <PropertyFilters
        filters={filters}
        onChange={setFilters}
        properties={properties}
        agents={agents}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Home}
          title={properties.length === 0 ? 'Sin propiedades' : 'Sin resultados'}
          description={
            properties.length === 0
              ? 'Importa tus propiedades desde Wasi o agrega una manualmente.'
              : 'No hay propiedades que coincidan con los filtros.'
          }
          action={
            properties.length === 0
              ? { label: 'Importar desde Wasi', onClick: handleWasiSync }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prop) => (
            <PropertyCard key={prop.id} property={prop} onSelect={setSelectedProperty} />
          ))}
        </div>
      )}

      <PropertyDetailSheet
        property={selectedProperty}
        open={selectedProperty !== null}
        onClose={() => setSelectedProperty(null)}
      />
    </div>
  )
}
