import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import { Metadata } from 'next'
import Image from 'next/image'
import { Bed, Bath, Car, Maximize, MapPin, Building2, Calendar, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PageProps { params: { id: string } }

async function getProperty(id: string) {
  const db = createAdminClient()
  const { data } = await (db as any)
    .from('properties')
    .select(`
      id, codigo, titulo, descripcion, tipo, for_sale, for_rent,
      property_type_label, property_condition_label,
      country_label, region_label, ciudad, zona, address, floor,
      precio, iso_currency, sale_price, rent_price, maintenance_fee,
      area, built_area, bedrooms, bathrooms, garages, furnished, building_date,
      estado_publicacion, disponibilidad,
      main_image_url, gallery_urls, video,
      features_internal, features_external,
      companies(nombre, email)
    `)
    .eq('id', id)
    .in('estado_publicacion', ['activo', 'destacado'])
    .maybeSingle()

  return data as any
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await getProperty(params.id)
  if (!p) return { title: 'Propiedad no encontrada' }
  return {
    title: `${p.titulo} | PropSync`,
    description: p.descripcion ?? `${p.property_type_label ?? 'Propiedad'} en ${p.ciudad ?? 'Panamá'}`,
    openGraph: {
      title: p.titulo,
      images: p.main_image_url ? [p.main_image_url] : [],
    },
  }
}

export default async function PublicPropertyPage({ params }: PageProps) {
  const p = await getProperty(params.id)
  if (!p) notFound()

  const price = p.tipo === 'venta'
    ? `$${Number(p.precio).toLocaleString()}`
    : `$${Number(p.precio).toLocaleString()}/mes`

  const gallery: string[] = Array.isArray(p.gallery_urls)
    ? (p.gallery_urls as string[])
    : p.main_image_url ? [p.main_image_url] : []

  const featuresInternal = Array.isArray(p.features_internal)
    ? (p.features_internal as { id: string; nombre: string }[])
    : []
  const featuresExternal = Array.isArray(p.features_external)
    ? (p.features_external as { id: string; nombre: string }[])
    : []

  const company = p.companies as unknown as { nombre: string; email: string } | null

  const dispLabel: Record<string, string> = {
    disponible: 'Disponible',
    vendido: 'Vendido',
    alquilado: 'Alquilado',
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-foreground">{company?.nombre ?? 'PropSync'}</span>
          <span className="text-xs text-muted-foreground font-mono">#{p.codigo ?? p.id.slice(0, 5).toUpperCase()}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Gallery */}
        {gallery.length > 0 && (
          <div className="space-y-2">
            <div className="relative h-64 sm:h-96 rounded-xl overflow-hidden bg-muted">
              <Image
                src={gallery[0]}
                alt={p.titulo}
                fill
                className="object-cover"
                unoptimized
                priority
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className="bg-black/70 text-white border-0">
                  {p.tipo === 'venta' ? 'Venta' : 'Arriendo'}
                </Badge>
                <Badge className={
                  p.disponibilidad === 'disponible'
                    ? 'bg-green-600 text-white border-0'
                    : p.disponibilidad === 'vendido'
                    ? 'bg-purple-600 text-white border-0'
                    : 'bg-amber-600 text-white border-0'
                }>
                  {dispLabel[p.disponibilidad] ?? p.disponibilidad}
                </Badge>
              </div>
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {gallery.slice(1, 5).map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <Image src={url} alt="" fill className="object-cover" unoptimized />
                    {i === 3 && gallery.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">
                        +{gallery.length - 5}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Title + price */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{p.titulo}</h1>
          {(p.ciudad || p.zona) && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {[p.zona, p.ciudad].filter(Boolean).join(', ')}
            </p>
          )}
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-3">{price}</p>
          {p.maintenance_fee && Number(p.maintenance_fee) > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              + ${Number(p.maintenance_fee).toLocaleString()}/mes mantenimiento
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {p.bedrooms != null && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
              <Bed className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{p.bedrooms}</p>
                <p className="text-xs text-muted-foreground">Habitaciones</p>
              </div>
            </div>
          )}
          {p.bathrooms != null && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
              <Bath className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{p.bathrooms}</p>
                <p className="text-xs text-muted-foreground">Baños</p>
              </div>
            </div>
          )}
          {p.garages != null && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
              <Car className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{p.garages}</p>
                <p className="text-xs text-muted-foreground">Garajes</p>
              </div>
            </div>
          )}
          {p.area && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
              <Maximize className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{p.area} m²</p>
                <p className="text-xs text-muted-foreground">Área total</p>
              </div>
            </div>
          )}
        </div>

        {/* Info grid */}
        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          {p.property_type_label && (
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-medium">{p.property_type_label}</p>
            </div>
          )}
          {p.property_condition_label && (
            <div>
              <p className="text-xs text-muted-foreground">Condición</p>
              <p className="font-medium">{p.property_condition_label}</p>
            </div>
          )}
          {p.built_area && (
            <div>
              <p className="text-xs text-muted-foreground">Área construida</p>
              <p className="font-medium">{p.built_area} m²</p>
            </div>
          )}
          {p.floor && (
            <div>
              <p className="text-xs text-muted-foreground">Piso</p>
              <p className="font-medium">{p.floor}</p>
            </div>
          )}
          {p.building_date && (
            <div>
              <p className="text-xs text-muted-foreground">Año</p>
              <p className="font-medium">{p.building_date}</p>
            </div>
          )}
          {p.furnished != null && (
            <div>
              <p className="text-xs text-muted-foreground">Amoblado</p>
              <p className="font-medium">{p.furnished ? 'Sí' : 'No'}</p>
            </div>
          )}
          {p.address && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Dirección</p>
              <p className="font-medium">{p.address}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {p.descripcion && (
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Descripción</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{p.descripcion}</p>
          </div>
        )}

        {/* Features */}
        {(featuresInternal.length > 0 || featuresExternal.length > 0) && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Características</h2>
            {featuresInternal.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Internas</p>
                <div className="flex flex-wrap gap-2">
                  {featuresInternal.map((f) => (
                    <span key={f.id} className="flex items-center gap-1 text-xs bg-muted rounded-full px-3 py-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {f.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {featuresExternal.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Amenidades</p>
                <div className="flex flex-wrap gap-2">
                  {featuresExternal.map((f) => (
                    <span key={f.id} className="flex items-center gap-1 text-xs bg-muted rounded-full px-3 py-1">
                      <Building2 className="h-3 w-3 text-blue-500" />
                      {f.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Publicado por {company?.nombre ?? 'PropSync'}</span>
          <span className="font-mono">Ref: #{p.codigo ?? p.id.slice(0, 5).toUpperCase()}</span>
        </div>
      </main>
    </div>
  )
}
