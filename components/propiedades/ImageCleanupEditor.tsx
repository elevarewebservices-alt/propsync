'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, Undo2, Loader2, X, Sparkles, AlertCircle } from 'lucide-react'

interface Point { x: number; y: number }
interface Stroke { size: number; points: Point[] } // coords/size in NATURAL image px

interface Props {
  file: File
  onCleaned: (file: File) => void
  onClose: () => void
}

/**
 * Lets the user brush over a watermark/object and removes it via ClipDrop.
 * Strokes are kept in the image's natural coordinates so we can render both the
 * on-screen preview (scaled down) and the mask sent to the API (full size, white
 * strokes on black) from the same data.
 */
export function ImageCleanupEditor({ file, onCleaned, onClose }: Props) {
  const imgCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  const [scale, setScale] = useState(1)
  const [brush, setBrush] = useState(28) // display px
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const drawing = useRef<Stroke | null>(null)

  // Load the image and size the canvases to fit the dialog.
  useEffect(() => {
    let cancelled = false
    createImageBitmap(file).then((bmp) => {
      if (cancelled) { bmp.close(); return }
      const maxW = Math.min(560, bmp.width)
      const s = maxW / bmp.width
      setScale(s)
      setBitmap(bmp)
    })
    return () => { cancelled = true }
  }, [file])

  const redraw = useCallback((all: Stroke[]) => {
    const img = imgCanvasRef.current
    const draw = drawCanvasRef.current
    if (!img || !draw || !bitmap) return
    const ictx = img.getContext('2d')!
    ictx.drawImage(bitmap, 0, 0, img.width, img.height)

    const dctx = draw.getContext('2d')!
    dctx.clearRect(0, 0, draw.width, draw.height)
    dctx.strokeStyle = 'rgba(239,68,68,0.55)'
    dctx.lineCap = 'round'
    dctx.lineJoin = 'round'
    for (const st of all) {
      dctx.lineWidth = st.size * scale
      dctx.beginPath()
      st.points.forEach((p, i) => {
        const x = p.x * scale, y = p.y * scale
        if (i === 0) dctx.moveTo(x, y); else dctx.lineTo(x, y)
      })
      if (st.points.length === 1) dctx.lineTo(st.points[0].x * scale + 0.1, st.points[0].y * scale)
      dctx.stroke()
    }
  }, [bitmap, scale])

  useEffect(() => { redraw(strokes) }, [strokes, redraw])

  function toNatural(e: React.PointerEvent): Point {
    const rect = drawCanvasRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
  }

  function onDown(e: React.PointerEvent) {
    e.preventDefault()
    drawCanvasRef.current?.setPointerCapture(e.pointerId)
    drawing.current = { size: brush / scale, points: [toNatural(e)] }
  }
  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return
    drawing.current.points.push(toNatural(e))
    redraw([...strokes, drawing.current])
  }
  function onUp() {
    if (drawing.current) {
      setStrokes((prev) => [...prev, drawing.current!])
      drawing.current = null
    }
  }

  async function buildMaskBlob(): Promise<Blob> {
    const mask = document.createElement('canvas')
    mask.width = bitmap!.width
    mask.height = bitmap!.height
    const ctx = mask.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, mask.width, mask.height)
    ctx.strokeStyle = '#fff'
    ctx.fillStyle = '#fff'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const st of strokes) {
      ctx.lineWidth = st.size
      ctx.beginPath()
      st.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
      // single dot
      if (st.points.length === 1) {
        ctx.beginPath()
        ctx.arc(st.points[0].x, st.points[0].y, st.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return await new Promise<Blob>((res) => mask.toBlob((b) => res(b!), 'image/png'))
  }

  async function handleClean() {
    if (strokes.length === 0) { setError('Pinta sobre lo que quieres quitar primero.'); return }
    setWorking(true)
    setError(null)
    try {
      const maskBlob = await buildMaskBlob()
      const fd = new FormData()
      fd.append('image_file', file, file.name)
      fd.append('mask_file', maskBlob, 'mask.png')
      const res = await fetch('/api/images/cleanup', { method: 'POST', body: fd })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'No se pudo limpiar la imagen')
        return
      }
      const blob = await res.blob()
      const cleaned = new File([blob], file.name.replace(/\.\w+$/, '') + '-limpia.png', { type: blob.type || 'image/png' })
      onCleaned(cleaned)
    } catch {
      setError('Error de conexión')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
      // Keep the modal clear of the notch / home indicator in the native app
      // (max() falls back to the normal 1rem gutter on the web).
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      onClick={onClose}
    >
      <div className="w-full max-w-xl max-h-full overflow-y-auto rounded-2xl bg-background p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-blue-600" /> Limpiar imagen
          </h2>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <p className="text-xs text-muted-foreground">
          Pinta con el dedo/mouse sobre la marca de agua, logo u objeto que quieras quitar. Luego pulsa “Quitar selección”.
        </p>

        <div className="relative mx-auto w-fit rounded-lg overflow-hidden border border-border touch-none">
          <canvas ref={imgCanvasRef} width={bitmap ? Math.round(bitmap.width * scale) : 0} height={bitmap ? Math.round(bitmap.height * scale) : 0} className="block" />
          <canvas
            ref={drawCanvasRef}
            width={bitmap ? Math.round(bitmap.width * scale) : 0}
            height={bitmap ? Math.round(bitmap.height * scale) : 0}
            className="absolute inset-0 cursor-crosshair touch-none"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          />
          {!bitmap && <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Pincel</span>
          <input type="range" min={10} max={70} value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="flex-1" />
          <Button type="button" variant="outline" size="sm" onClick={() => setStrokes((p) => p.slice(0, -1))} disabled={strokes.length === 0} className="gap-1.5">
            <Undo2 className="h-3.5 w-3.5" /> Deshacer
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleClean} disabled={working} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
            {working ? 'Limpiando…' : 'Quitar selección'}
          </Button>
        </div>
      </div>
    </div>
  )
}
