import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import { Metadata } from 'next'
import { PrintControls } from './PrintControls'

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
      area, built_area, bedrooms, bathrooms, half_bathrooms, garages, furnished, building_date,
      disponibilidad,
      main_image_url, gallery_urls,
      features_internal, features_external,
      companies(nombre, email)
    `)
    .eq('id', id)
    .maybeSingle()
  return data as any
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await getProperty(params.id)
  return { title: p ? `Ficha — ${p.titulo}` : 'Propiedad no encontrada' }
}

export default async function PropertyPdfPage({ params }: PageProps) {
  const p = await getProperty(params.id)
  if (!p) notFound()

  const price = p.tipo === 'venta'
    ? `$${Number(p.precio).toLocaleString()}`
    : `$${Number(p.precio).toLocaleString()}/mes`

  const gallery: string[] = Array.isArray(p.gallery_urls)
    ? (p.gallery_urls as string[])
    : p.main_image_url ? [p.main_image_url] : []
  const hero = p.main_image_url ?? gallery[0] ?? null
  const thumbs = gallery.filter((u) => u !== hero).slice(0, 6)

  const featuresInternal = Array.isArray(p.features_internal)
    ? (p.features_internal as { id: string; nombre: string }[]) : []
  const featuresExternal = Array.isArray(p.features_external)
    ? (p.features_external as { id: string; nombre: string }[]) : []

  const company = p.companies as unknown as { nombre: string; email: string | null } | null
  const ref = `#${p.codigo ?? p.id.slice(0, 5).toUpperCase()}`

  const dispLabel: Record<string, string> = { disponible: 'Disponible', vendido: 'Vendido', alquilado: 'Alquilado' }

  const specs = [
    p.bedrooms != null ? { label: 'Habitaciones', value: p.bedrooms } : null,
    p.bathrooms != null ? { label: 'Baños', value: p.bathrooms } : null,
    p.garages != null ? { label: 'Garajes', value: p.garages } : null,
    p.area ? { label: 'Área total', value: `${p.area} m²` } : null,
    p.built_area ? { label: 'Área construida', value: `${p.built_area} m²` } : null,
    p.property_type_label ? { label: 'Tipo', value: p.property_type_label } : null,
    p.property_condition_label ? { label: 'Condición', value: p.property_condition_label } : null,
    p.building_date ? { label: 'Año', value: p.building_date } : null,
  ].filter(Boolean) as { label: string; value: string | number }[]

  return (
    <div className="pdf-root">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
          .pdf-root { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .pdf-root { background:#fff; color:#0f0f1a; font-family: var(--font-inter), system-ui, sans-serif; max-width: 820px; margin: 0 auto; padding: 24px; }
        .pdf-img { width:100%; height:340px; object-fit:cover; border-radius:12px; }
        .thumb { width:100%; height:90px; object-fit:cover; border-radius:8px; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #1a73e8', paddingBottom: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a73e8' }}>{company?.nombre ?? 'PropSync'}</div>
          <div style={{ fontSize: 11, color: '#666' }}>Ficha de propiedad</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#666' }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f0f1a' }}>{ref}</div>
          <div>{p.tipo === 'venta' ? 'En venta' : 'En arriendo'} · {dispLabel[p.disponibilidad] ?? p.disponibilidad}</div>
        </div>
      </div>

      {/* Hero */}
      {hero && <img src={hero} alt={p.titulo} className="pdf-img" />}

      {/* Title + price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginTop: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{p.titulo}</h1>
          {(p.zona || p.ciudad) && (
            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
              {[p.zona, p.ciudad, p.country_label].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1a73e8', whiteSpace: 'nowrap' }}>{price}</div>
      </div>

      {/* Specs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
        {specs.map((s) => (
          <div key={s.label} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#777' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {p.address && (
        <div style={{ marginTop: 14, fontSize: 12 }}>
          <span style={{ color: '#777' }}>Dirección: </span>{p.address}
        </div>
      )}

      {/* Description */}
      {p.descripcion && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Descripción</h2>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: '#333', whiteSpace: 'pre-line', margin: 0 }}>{p.descripcion}</p>
        </div>
      )}

      {/* Features */}
      {(featuresInternal.length > 0 || featuresExternal.length > 0) && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Características</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[...featuresInternal, ...featuresExternal].map((f) => (
              <span key={f.id} style={{ fontSize: 11, background: '#f1f5f9', borderRadius: 999, padding: '3px 10px' }}>{f.nombre}</span>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      {thumbs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {thumbs.map((u, i) => <img key={i} src={u} alt="" className="thumb" />)}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666' }}>
        <div>
          <strong style={{ color: '#0f0f1a' }}>{company?.nombre ?? 'PropSync'}</strong>
          {company?.email && <span> · {company.email}</span>}
        </div>
        <div style={{ fontFamily: 'monospace' }}>Ref: {ref}</div>
      </div>

      <PrintControls />
    </div>
  )
}
