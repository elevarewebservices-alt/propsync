'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus, ArrowUpRight } from 'lucide-react'
import {
  assetUrl,
  emptyTour,
  slugify,
  type VirtualTour,
} from '@/lib/virtual-tours'
import './tours.css'
export async function tourRequest(url: string, method = 'GET', body?: unknown) {
  const response = await fetch(url, {
    method,
    ...(body
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  })
  const data = await response.json()
  if (!response.ok)
    throw new Error(data.error || 'No se pudo completar la operación.')
  return data
}
export function TourManager() {
  const [tours, setTours] = useState<VirtualTour[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  useEffect(() => {
    tourRequest('/api/virtual-tours')
      .then(setTours)
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false))
  }, [])
  async function change(tour: VirtualTour, remove = false) {
    if (
      remove &&
      !confirm(
        `¿Eliminar “${tour.name}” y sus imágenes? Esta acción no se puede deshacer.`,
      )
    )
      return
    setBusy(true)
    setMessage('')
    try {
      const data = await tourRequest(
        `/api/virtual-tours/${tour.id}`,
        remove ? 'DELETE' : 'PATCH',
        remove
          ? undefined
          : {
              ...tour,
              status: tour.status === 'published' ? 'unpublished' : 'published',
            },
      )
      setTours((list) =>
        remove
          ? list.filter((t) => t.id !== tour.id)
          : list.map((t) => (t.id === tour.id ? data : t)),
      )
      setMessage(
        remove
          ? 'Tour eliminado.'
          : data.status === 'published'
            ? 'Tour publicado. Ya puedes compartirlo.'
            : 'Tour despublicado.',
      )
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="vt-admin">
      <header className="vt-admin-header">
        <div>
          <h1>Virtual Tours</h1>
          <p className="vt-muted">
            Conecta espacios. Abre la puerta a tu próxima venta.
          </p>
        </div>
        <div className="vt-actions">
          <Link href="/tour/demo" target="_blank">
            Ver demo <ArrowUpRight size={16} />
          </Link>
          <button className="vt-primary" onClick={() => setCreating((v) => !v)}>
            <Plus size={17} />
            Crear tour
          </button>
        </div>
      </header>
      {message && (
        <p className="vt-alert" role="status">
          {message}
        </p>
      )}
      {creating && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setMessage('')
            try {
              const tour = await tourRequest('/api/virtual-tours', 'POST', {
                ...emptyTour(),
                name,
                slug,
              })
              location.assign(`/virtual-tours/${tour.id}`)
            } catch (error) {
              setMessage((error as Error).message)
              setBusy(false)
            }
          }}
        >
          <h2>Empieza con un nombre</h2>
          <div className="vt-form-grid">
            <label>
              Nombre del tour
              <input
                required
                maxLength={150}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setSlug(slugify(e.target.value))
                }}
                placeholder="Apartamento 2203 · BLUR"
              />
            </label>
            <label>
              Enlace público
              <input
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={80}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <span className="vt-muted">
                /tour/{slug || 'nombre-del-tour'}
              </span>
            </label>
          </div>
          <div className="vt-actions">
            <button className="vt-primary" disabled={busy}>
              {busy ? 'Creando…' : 'Crear y subir imágenes'}
            </button>
            <button type="button" onClick={() => setCreating(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {loading ? (
        <p role="status">Cargando tours…</p>
      ) : !tours.length && !creating ? (
        <div className="vt-empty">
          <h2>Tu primera visita empieza aquí</h2>
          <p className="vt-muted">
            Sube las fotos, conecta las habitaciones y comparte el recorrido.
          </p>
        </div>
      ) : (
        <div className="vt-list">
          {tours.map((t) => (
            <article key={t.id} className="vt-tour-row">
              {t.cover || t.scenes[0] ? (
                <img
                  src={assetUrl(t.id, t.cover || t.scenes[0].thumbnail)}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="vt-tour-placeholder" />
              )}
              <div>
                <h2>{t.name}</h2>
                <p className="vt-muted">
                  {t.project || 'Sin proyecto'} ·{' '}
                  {t.property_id ? 'Propiedad vinculada' : 'Tour independiente'}
                </p>
                <span className="vt-status">
                  {
                    {
                      draft: 'Borrador',
                      published: 'Publicado',
                      unpublished: 'Despublicado',
                    }[t.status]
                  }
                </span>
                <span className="vt-muted">
                  {t.scenes.length} escenas ·{' '}
                  {new Date(t.created_at).toLocaleDateString('es-PA')}
                </span>
                <p className="vt-muted">/tour/{t.slug}</p>
              </div>
              <div className="vt-actions">
                <Link href={`/virtual-tours/${t.id}`}>Editar</Link>
                <Link href={`/virtual-tours/${t.id}?preview=1`}>Preview</Link>
                <button
                  disabled={t.status !== 'published'}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${location.origin}/tour/${t.slug}`,
                      )
                      setMessage('Enlace copiado.')
                    } catch {
                      setMessage(
                        'No se pudo copiar. Abre el tour y copia su dirección.',
                      )
                    }
                  }}
                >
                  Copiar link
                </button>
                <button disabled={busy} onClick={() => change(t)}>
                  {t.status === 'published' ? 'Despublicar' : 'Publicar'}
                </button>
                <button
                  className="vt-danger"
                  disabled={busy}
                  onClick={() => change(t, true)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
