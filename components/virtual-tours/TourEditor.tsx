'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Save } from 'lucide-react'
import {
  assetUrl,
  type VirtualTour,
  type TourScene,
  type Hotspot,
  type TourProperty,
} from '@/lib/virtual-tours'
import { resizeImageFile } from '@/lib/image-resize'
import { tourRequest } from './TourManager'
import { SceneViewer } from './SceneViewer'
import { PublicTour } from './PublicTour'
import { ShareTour } from './ShareTour'
import './tours.css'
export function TourEditor({ id }: { id: string }) {
  const [tour, setTour] = useState<VirtualTour | null>(null)
  const [current, setCurrent] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [preview, setPreview] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [point, setPoint] = useState<Pick<
    Hotspot,
    'x' | 'y' | 'yaw' | 'pitch'
  > | null>(null)
  const [destination, setDestination] = useState('')
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<'photo' | 'panorama'>('photo')
  const [properties, setProperties] = useState<
    (TourProperty & { id: string })[]
  >([])
  useEffect(() => {
    tourRequest(`/api/virtual-tours/${id}`)
      .then((data) => {
        setTour(data)
        setCurrent(data.initial_scene_id)
        setPreview(new URLSearchParams(location.search).get('preview') === '1')
      })
      .catch((e) => setMessage(e.message))
    tourRequest('/api/properties')
      .then((data) =>
        setProperties(Array.isArray(data) ? data : (data.properties ?? [])),
      )
      .catch(() => {})
  }, [id])
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', fn)
    return () => window.removeEventListener('beforeunload', fn)
  }, [dirty])
  useEffect(() => {
    if (!preview) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(false)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [preview])
  function update(patch: Partial<VirtualTour>) {
    setTour((t) => (t ? { ...t, ...patch } : t))
    setDirty(true)
  }
  const scene = tour?.scenes.find((s) => s.id === current)
  function updateScene(patch: Partial<TourScene>) {
    if (tour && scene)
      update({
        scenes: tour.scenes.map((s) =>
          s.id === scene.id ? { ...s, ...patch } : s,
        ),
      })
  }
  async function save(status = tour?.status) {
    if (!tour) return
    setBusy(true)
    setMessage('')
    try {
      const data = await tourRequest(`/api/virtual-tours/${id}`, 'PATCH', {
        ...tour,
        status,
      })
      setTour(data)
      setDirty(false)
      setMessage(
        status === 'published'
          ? 'Tour publicado. El enlace está listo para compartir.'
          : 'Cambios guardados.',
      )
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function upload(files: FileList | null, replace = false) {
    if (!files || !tour) return
    const selected = Array.from(files)
    if (!replace && tour.scenes.length + selected.length > 40) {
      setMessage('Máximo 40 escenas por tour.')
      return
    }
    setBusy(true)
    setMessage('Preparando imágenes…')
    const added: TourScene[] = []
    let replacement: Partial<TourScene> | null = null
    try {
      for (let i = 0; i < selected.length; i++) {
        const file = selected[i]
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 25 * 1024 * 1024
        )
          throw new Error('Usa JPG, PNG o WebP de hasta 25 MB.')
        setMessage(`Subiendo imagen ${i + 1} de ${selected.length}…`)
        const uploadKind = replace && scene ? scene.kind : kind
        const resized = await resizeImageFile(
          file,
          uploadKind === 'panorama' ? 4096 : 2400,
          0.84,
        )
        const form = new FormData()
        form.set('file', resized)
        form.set('kind', uploadKind)
        const response = await fetch(`/api/virtual-tours/${id}/assets`, {
          method: 'POST',
          body: form,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        if (replace) replacement = { ...data, hotspots: [] }
        else
          added.push({
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^.]+$/, '').slice(0, 100),
            ...data,
            kind: uploadKind,
            space: 'Otro',
            hotspots: [],
          })
      }
      setMessage(
        'Imágenes listas. Guarda los cambios para conservar las escenas.',
      )
    } catch (e) {
      setMessage(
        `${(e as Error).message} Las imágenes completadas se conservan; guarda los cambios.`,
      )
    } finally {
      if (replacement && scene) {
        update({
          scenes: tour.scenes.map((s) =>
            s.id === scene.id ? { ...s, ...replacement } : s,
          ),
          cover: tour.cover === scene.image ? replacement.image! : tour.cover,
        })
      } else if (added.length) {
        update({
          scenes: [...tour.scenes, ...added],
          initial_scene_id: tour.initial_scene_id || added[0].id,
          cover: tour.cover || added[0].image,
        })
        setCurrent(added[0].id)
      }
      setBusy(false)
    }
  }
  if (!tour)
    return (
      <div className="vt-admin">
        <Link href="/virtual-tours">Volver a Virtual Tours</Link>
        <p role="status">{message || 'Cargando editor…'}</p>
      </div>
    )
  const property = properties.find((p) => p.id === tour.property_id)
  return (
    <section className="vt-admin">
      <header className="vt-admin-header">
        <div>
          <Link href="/virtual-tours" className="vt-muted">
            <ArrowLeft size={15} className="inline" /> Virtual Tours
          </Link>
          <h1>{tour.name}</h1>
          <p className="vt-muted">
            {dirty ? 'Cambios sin guardar' : 'Todo guardado'} ·{' '}
            {tour.status === 'published'
              ? 'Publicado'
              : tour.status === 'draft'
                ? 'Borrador'
                : 'Despublicado'}
          </p>
        </div>
        <div className="vt-actions">
          <button disabled={busy} onClick={() => save()}>
            <Save size={16} />
            Guardar
          </button>
          <button
            disabled={!tour.scenes.length || busy}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
          <button
            className="vt-primary"
            disabled={busy || !tour.scenes.length}
            onClick={() =>
              save(tour.status === 'published' ? 'unpublished' : 'published')
            }
          >
            {tour.status === 'published' ? 'Despublicar' : 'Guardar y publicar'}
          </button>
        </div>
      </header>
      {message && (
        <p className="vt-alert" role="status">
          {message}
        </p>
      )}
      <fieldset disabled={busy}>
        <details>
          <summary>Información del tour y contacto</summary>
          <div className="vt-form-grid">
            <label>
              Nombre
              <input
                value={tour.name}
                maxLength={150}
                onChange={(e) => update({ name: e.target.value })}
              />
            </label>
            <label>
              Slug
              <input
                value={tour.slug}
                maxLength={80}
                onChange={(e) => update({ slug: e.target.value })}
              />
              <span className="vt-muted">/tour/{tour.slug}</span>
            </label>
            <label>
              Propiedad
              <select
                value={tour.property_id || ''}
                onChange={(e) =>
                  update({ property_id: e.target.value || null })
                }
              >
                <option value="">Tour independiente</option>
                {properties.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.titulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Proyecto
              <input
                value={tour.project}
                maxLength={150}
                onChange={(e) => update({ project: e.target.value })}
                placeholder="Nombre del proyecto (opcional)"
              />
            </label>
            <label className="vt-wide">
              Descripción
              <textarea
                value={tour.description}
                maxLength={3000}
                onChange={(e) => update({ description: e.target.value })}
              />
            </label>
            <label>
              Tipo de contacto
              <select
                value={tour.cta.type}
                onChange={(e) =>
                  update({
                    cta: {
                      ...tour.cta,
                      type: e.target.value as VirtualTour['cta']['type'],
                      value: '',
                    },
                  })
                }
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Teléfono</option>
                <option value="email">Email</option>
                <option value="form">Formulario externo HTTPS</option>
              </select>
            </label>
            <label>
              {tour.cta.type === 'form'
                ? 'URL del formulario'
                : tour.cta.type === 'email'
                  ? 'Dirección de email'
                  : 'Teléfono con código de país'}
              <input
                value={tour.cta.value}
                maxLength={500}
                onChange={(e) =>
                  update({ cta: { ...tour.cta, value: e.target.value } })
                }
              />
            </label>
            <label>
              Texto del botón
              <input
                maxLength={80}
                value={tour.cta.label}
                onChange={(e) =>
                  update({ cta: { ...tour.cta, label: e.target.value } })
                }
              />
            </label>
          </div>
        </details>
        <div className="vt-upload">
          <h2>Añade los espacios de la propiedad</h2>
          <p className="vt-muted">
            Fotos normales o panoramas 360° equirectangulares (2:1). Hasta 40
            escenas. JPG, PNG y WebP.
          </p>
          <div className="vt-form-grid">
            <label>
              Tipo de imágenes
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as 'photo' | 'panorama')
                }
              >
                <option value="photo">Fotografías normales</option>
                <option value="panorama">Panoramas 360°</option>
              </select>
            </label>
            <label>
              Subir imágenes
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  void upload(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
        <div className="vt-editor-layout">
          <nav className="vt-scene-list" aria-label="Escenas para editar">
            {tour.scenes.map((s, i) => (
              <button
                key={s.id}
                aria-current={s.id === current ? 'true' : undefined}
                onClick={() => {
                  setCurrent(s.id)
                  setPoint(null)
                  setPlacing(false)
                }}
              >
                <img src={assetUrl(id, s.thumbnail)} alt="" />
                <span>
                  {i + 1}. {s.name}
                  {s.id === tour.initial_scene_id && (
                    <small className="block vt-muted">Escena inicial</small>
                  )}
                </span>
              </button>
            ))}
          </nav>
          <div>
            {scene ? (
              <>
                <div className="vt-form-grid">
                  <label>
                    Nombre de la escena
                    <input
                      maxLength={100}
                      value={scene.name}
                      onChange={(e) => updateScene({ name: e.target.value })}
                    />
                  </label>
                  <label>
                    Tipo de espacio
                    <select
                      value={scene.space}
                      onChange={(e) => updateScene({ space: e.target.value })}
                    >
                      {[
                        'Otro',
                        'Sala',
                        'Cocina',
                        'Habitación',
                        'Balcón',
                        'Baño',
                        'Lobby',
                        'Amenidades',
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="vt-actions">
                  <button
                    onClick={() => update({ initial_scene_id: scene.id })}
                    disabled={tour.initial_scene_id === scene.id}
                  >
                    Escena inicial
                  </button>
                  <button
                    onClick={() => update({ cover: scene.image })}
                    disabled={tour.cover === scene.image}
                  >
                    Usar como portada
                  </button>
                  {[-1, 1].map((direction) => (
                    <button
                      key={direction}
                      aria-label={
                        direction === -1 ? 'Mover antes' : 'Mover después'
                      }
                      disabled={
                        tour.scenes.indexOf(scene) + direction < 0 ||
                        tour.scenes.indexOf(scene) + direction >=
                          tour.scenes.length
                      }
                      onClick={() => {
                        const list = [...tour.scenes]
                        const i = list.indexOf(scene)
                        ;[list[i], list[i + direction]] = [
                          list[i + direction],
                          list[i],
                        ]
                        update({ scenes: list })
                      }}
                    >
                      {direction < 0 ? (
                        <ArrowUp size={17} />
                      ) : (
                        <ArrowDown size={17} />
                      )}
                    </button>
                  ))}
                  <button
                    className="vt-danger"
                    onClick={() => {
                      if (!confirm('¿Eliminar esta escena y sus conexiones?'))
                        return
                      const scenes = tour.scenes
                        .filter((s) => s.id !== scene.id)
                        .map((s) => ({
                          ...s,
                          hotspots: s.hotspots.filter(
                            (h) => h.destination !== scene.id,
                          ),
                        }))
                      update({
                        scenes,
                        initial_scene_id:
                          tour.initial_scene_id === scene.id
                            ? (scenes[0]?.id ?? '')
                            : tour.initial_scene_id,
                        cover:
                          tour.cover === scene.image
                            ? (scenes[0]?.image ?? '')
                            : tour.cover,
                      })
                      setCurrent(scenes[0]?.id ?? '')
                    }}
                  >
                    Eliminar escena
                  </button>
                </div>
                <div className="vt-editor-canvas">
                  <SceneViewer
                    tourId={id}
                    scene={scene}
                    onNavigate={setCurrent}
                    onPlace={
                      placing
                        ? (p) => {
                            setPoint(p)
                            setDestination(
                              tour.scenes.find((s) => s.id !== scene.id)?.id ??
                                '',
                            )
                            setLabel('')
                            setPlacing(false)
                          }
                        : undefined
                    }
                  />
                </div>
                <div className="vt-actions">
                  <button
                    className="vt-primary"
                    disabled={tour.scenes.length < 2}
                    onClick={() => {
                      setPlacing((v) => !v)
                      setPoint(null)
                    }}
                  >
                    <Plus size={16} />
                    {placing ? 'Cancelar colocación' : 'Añadir hotspot'}
                  </button>
                  <p className="vt-muted">
                    {placing
                      ? 'Haz clic en la imagen donde quieras conectar otro espacio.'
                      : 'Conecta esta escena con otra habitación.'}
                  </p>
                </div>
                {point && (
                  <div className="vt-alert">
                    <h3>Conectar con otra escena</h3>
                    <div className="vt-form-grid">
                      <label>
                        Destino
                        <select
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                        >
                          {tour.scenes
                            .filter((s) => s.id !== scene.id)
                            .map((s) => (
                              <option value={s.id} key={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Etiqueta opcional
                        <input
                          value={label}
                          maxLength={100}
                          onChange={(e) => setLabel(e.target.value)}
                          placeholder="Ir a cocina"
                        />
                      </label>
                    </div>
                    <div className="vt-actions">
                      <button
                        onClick={() => {
                          updateScene({
                            hotspots: [
                              ...scene.hotspots,
                              {
                                ...point,
                                id: crypto.randomUUID(),
                                destination,
                                label:
                                  label ||
                                  tour.scenes.find((s) => s.id === destination)
                                    ?.name ||
                                  'Ir a otra escena',
                              },
                            ],
                          })
                          setPoint(null)
                        }}
                      >
                        Crear conexión
                      </button>
                      <button onClick={() => setPoint(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
                {scene.hotspots.map((h) => (
                  <div className="vt-hotspot-row" key={h.id}>
                    <label>
                      Etiqueta
                      <input
                        value={h.label}
                        maxLength={100}
                        onChange={(e) =>
                          updateScene({
                            hotspots: scene.hotspots.map((v) =>
                              v.id === h.id
                                ? { ...v, label: e.target.value }
                                : v,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Destino
                      <select
                        value={h.destination}
                        onChange={(e) =>
                          updateScene({
                            hotspots: scene.hotspots.map((v) =>
                              v.id === h.id
                                ? { ...v, destination: e.target.value }
                                : v,
                            ),
                          })
                        }
                      >
                        {tour.scenes
                          .filter((s) => s.id !== scene.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="vt-actions">
                      <button
                        className="vt-danger"
                        onClick={() =>
                          updateScene({
                            hotspots: scene.hotspots.filter(
                              (v) => v.id !== h.id,
                            ),
                          })
                        }
                      >
                        Quitar hotspot
                      </button>
                    </div>
                  </div>
                ))}
                <details>
                  <summary>Reemplazar imagen</summary>
                  <p className="vt-muted">
                    Se quitarán los hotspots de esta escena porque su posición
                    depende de la imagen.
                  </p>
                  <label>
                    Nueva imagen
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        void upload(e.target.files, true)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </details>
              </>
            ) : (
              <div className="vt-empty">
                Sube imágenes y selecciona una escena para conectar los
                espacios.
              </div>
            )}
          </div>
        </div>
      </fieldset>
      {tour.status === 'published' && !dirty && (
        <details>
          <summary>Compartir enlace y descargar QR</summary>
          <ShareTour slug={tour.slug} name={tour.name} />
        </details>
      )}
      {preview && (
        <div
          className="vt-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa del tour"
        >
          <button
            className="vt-close-preview"
            autoFocus
            onClick={() => setPreview(false)}
          >
            Volver al editor
          </button>
          <PublicTour tour={tour} property={property} preview />
        </div>
      )}
    </section>
  )
}
