'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Minus, Plus, RotateCcw } from 'lucide-react'
import { assetUrl, type TourScene, type Hotspot } from '@/lib/virtual-tours'
import '@photo-sphere-viewer/core/index.css'
import '@photo-sphere-viewer/markers-plugin/index.css'

type Point = Pick<Hotspot, 'x' | 'y' | 'yaw' | 'pitch'>
type Props = {
  tourId: string
  scene: TourScene
  onNavigate: (id: string) => void
  onPlace?: (point: Point) => void
}
export function SceneViewer({ tourId, scene, onNavigate, onPlace }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const photo = useRef<HTMLImageElement>(null)
  const callbacks = useRef({ onNavigate, onPlace })
  callbacks.current = { onNavigate, onPlace }
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{
    x: number
    y: number
    px: number
    py: number
    moved: boolean
  } | null>(null)
  const psv = useRef<import('@photo-sphere-viewer/core').Viewer | null>(null)
  const url = assetUrl(tourId, scene.image)
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setError('')
    setLoaded(!!photo.current?.complete && photo.current.naturalWidth > 0)
  }, [url])
  useEffect(() => {
    if (scene.kind !== 'panorama' || !container.current) return
    let active = true
    async function init() {
      try {
        const [{ Viewer }, { MarkersPlugin }] = await Promise.all([
          import('@photo-sphere-viewer/core'),
          import('@photo-sphere-viewer/markers-plugin'),
        ])
        if (!active || !container.current) return
        const markers = scene.hotspots.map((h) => {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'vt-panorama-hotspot'
          button.textContent = h.label || 'Ir a otra escena'
          button.setAttribute('aria-label', button.textContent)
          button.onclick = (event) => {
            event.stopPropagation()
            callbacks.current.onNavigate(h.destination)
          }
          return {
            id: h.id,
            position: { yaw: h.yaw, pitch: h.pitch },
            element: button,
            anchor: 'center center',
          }
        })
        const viewer = new Viewer({
          container: container.current,
          panorama: url,
          navbar: ['zoom', 'move', 'fullscreen'],
          defaultZoomLvl: 20,
          touchmoveTwoFingers: false,
          mousewheelCtrlKey: false,
          plugins: [[MarkersPlugin, { markers }]],
        })
        psv.current = viewer
        viewer.addEventListener('ready', () => {
          if (active) setLoaded(true)
        })
        viewer.addEventListener('panorama-error', () => {
          if (active)
            setError(
              'No se pudo cargar el panorama. Revisa la imagen o recarga.',
            )
        })
        viewer.addEventListener('click', (event) =>
          callbacks.current.onPlace?.({
            x: 0.5,
            y: 0.5,
            yaw: event.data.yaw,
            pitch: event.data.pitch,
          }),
        )
      } catch {
        if (active)
          setError(
            'No se pudo iniciar el visor 360°. Prueba un navegador con WebGL.',
          )
      }
    }
    void init()
    return () => {
      active = false
      psv.current?.destroy()
      psv.current = null
    }
  }, [url, scene.kind, scene.hotspots])
  if (scene.kind === 'panorama')
    return (
      <div className="vt-scene">
        <div ref={container} className="vt-panorama" />
        {error && (
          <p className="vt-image-error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  return (
    <div className="vt-scene">
      {!loaded && !error && (
        <p className="vt-image-error" role="status">
          Cargando espacio…
        </p>
      )}
      {error && (
        <p className="vt-image-error" role="alert">
          {error}
        </p>
      )}
      <div
        className="vt-photo-stage"
        style={{
          cursor: onPlace ? 'crosshair' : zoom > 1 ? 'grab' : 'default',
          touchAction: zoom > 1 ? 'none' : 'auto',
        }}
        onPointerDown={(e) => {
          if (!onPlace && zoom > 1) {
            e.currentTarget.setPointerCapture(e.pointerId)
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              px: pan.x,
              py: pan.y,
              moved: false,
            }
          }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const rect = e.currentTarget.getBoundingClientRect()
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          d.moved ||= Math.abs(dx) + Math.abs(dy) > 4
          const clamp = (n: number, max: number) =>
            Math.max(-max, Math.min(max, n))
          setPan({
            x: clamp(d.px + dx, (rect.width * (zoom - 1)) / 2),
            y: clamp(d.py + dy, (rect.height * (zoom - 1)) / 2),
          })
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onPointerCancel={() => {
          drag.current = null
        }}
      >
        <div
          className="vt-photo-plane"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <img
            ref={photo}
            src={url}
            alt={scene.name}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() =>
              setError(
                'No se pudo cargar la imagen. Recarga para volver a intentarlo.',
              )
            }
            onClick={(e) => {
              if (!onPlace) return
              const r = e.currentTarget.getBoundingClientRect()
              onPlace({
                x: (e.clientX - r.left) / r.width,
                y: (e.clientY - r.top) / r.height,
                yaw: 0,
                pitch: 0,
              })
            }}
          />
          {loaded &&
            scene.hotspots.map((h) => (
              <button
                key={h.id}
                className="vt-hotspot"
                style={{
                  left: `${h.x * 100}%`,
                  top: `${h.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigate(h.destination)
                }}
                aria-label={h.label || 'Ir a otra escena'}
              >
                <ArrowUpRight size={21} />
                <span>{h.label || 'Ir a otra escena'}</span>
              </button>
            ))}
        </div>
      </div>
      {!onPlace && (
        <div className="vt-zoom">
          <button
            aria-label="Alejar"
            disabled={zoom <= 1}
            onClick={() => {
              setZoom((z) => Math.max(1, z - 0.5))
              setPan({ x: 0, y: 0 })
            }}
          >
            <Minus size={18} />
          </button>
          <button
            aria-label="Restablecer vista"
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
          >
            <RotateCcw size={17} />
          </button>
          <button
            aria-label="Acercar"
            disabled={zoom >= 3}
            onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
          >
            <Plus size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
