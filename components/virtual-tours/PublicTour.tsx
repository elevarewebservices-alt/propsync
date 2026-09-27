'use client'
import { useEffect, useRef, useState } from 'react'
import { Info, Share2, X, ArrowUpRight } from 'lucide-react'
import {
  type VirtualTour,
  type TourProperty,
  assetUrl,
  ctaUrl,
} from '@/lib/virtual-tours'
import { SceneViewer } from './SceneViewer'
import { ShareTour } from './ShareTour'
import './tours.css'
export function PublicTour({
  tour,
  property,
  preview = false,
}: {
  tour: VirtualTour
  property?: TourProperty | null
  preview?: boolean
}) {
  const [current, setCurrent] = useState(tour.initial_scene_id)
  const [panel, setPanel] = useState<'info' | 'share' | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const scene = tour.scenes.find((s) => s.id === current) ?? tour.scenes[0]
  useEffect(() => {
    if (panel) dialog.current?.showModal()
    else dialog.current?.close()
  }, [panel])
  const cta = ctaUrl(tour.cta, tour.name)
  if (!scene)
    return (
      <div className="vt-empty">Añade escenas para previsualizar el tour.</div>
    )
  return (
    <div className="vt-public">
      <header className="vt-public-header">
        <div>
          <a href="https://propsyncia.com" className="vt-brand">
            PropSync <span>Virtual Tour</span>
          </a>
          <h1>{tour.name}</h1>
          <p>
            {tour.project}
            {tour.id === 'demo' ? ' · Imágenes ilustrativas' : ''}
            {preview ? ' · Vista previa privada' : ''}
          </p>
        </div>
        <div className="vt-actions">
          <button onClick={() => setPanel('info')} aria-label="Ver propiedad">
            <Info size={19} />
            <span>Ver propiedad</span>
          </button>
          <button onClick={() => setPanel('share')} aria-label="Compartir tour">
            <Share2 size={19} />
            <span>Compartir</span>
          </button>
        </div>
      </header>
      <main className="vt-public-main">
        <SceneViewer
          key={scene.id}
          tourId={tour.id}
          scene={scene}
          onNavigate={setCurrent}
        />
        <div className="vt-scene-caption">
          <strong>{scene.name}</strong>
          <span>
            {scene.kind === 'panorama'
              ? '360° · Arrastra para explorar'
              : 'Fotografía · Acerca para explorar'}
          </span>
        </div>
      </main>
      <footer className="vt-public-footer">
        <nav className="vt-thumbnails" aria-label="Espacios del recorrido">
          {tour.scenes.map((s, i) => (
            <button
              key={s.id}
              aria-current={s.id === scene.id ? 'true' : undefined}
              onClick={() => setCurrent(s.id)}
            >
              <img src={assetUrl(tour.id, s.thumbnail)} alt="" loading="lazy" />
              <span>
                {String(i + 1).padStart(2, '0')} · {s.name}
              </span>
            </button>
          ))}
        </nav>
        {cta && (
          <a className="vt-cta" href={cta} target="_blank" rel="noreferrer">
            {tour.cta.label}
            <ArrowUpRight size={18} />
          </a>
        )}
      </footer>
      <dialog
        ref={dialog}
        className="vt-dialog"
        onCancel={() => setPanel(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setPanel(null)
        }}
      >
        <div className="vt-dialog-head">
          <h2>{panel === 'share' ? 'Compartir tour' : 'Ver propiedad'}</h2>
          <button autoFocus aria-label="Cerrar" onClick={() => setPanel(null)}>
            <X size={22} />
          </button>
        </div>
        {panel === 'share' ? (
          <ShareTour slug={tour.slug} name={tour.name} />
        ) : (
          <div className="vt-property">
            <h3>{property?.titulo ?? tour.name}</h3>
            <p>{tour.project}</p>
            {property && (
              <>
                <strong className="vt-price">
                  {new Intl.NumberFormat('es-PA', {
                    style: 'currency',
                    currency: property.iso_currency || 'USD',
                    maximumFractionDigits: 0,
                  }).format(property.precio)}
                </strong>
                <dl>
                  <div>
                    <dt>Superficie</dt>
                    <dd>{property.area ?? '—'} m²</dd>
                  </div>
                  <div>
                    <dt>Habitaciones</dt>
                    <dd>{property.bedrooms ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Baños</dt>
                    <dd>{property.bathrooms ?? '—'}</dd>
                  </div>
                </dl>
              </>
            )}
            <p>{tour.description}</p>
            <p>{property?.descripcion}</p>
            {cta && (
              <a className="vt-cta" href={cta} target="_blank" rel="noreferrer">
                {tour.cta.label}
                <ArrowUpRight size={18} />
              </a>
            )}
          </div>
        )}
      </dialog>
    </div>
  )
}
