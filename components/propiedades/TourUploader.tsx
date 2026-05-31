'use client'

import { useState, useRef } from 'react'
import { TourRoom } from '@/lib/types'
import { Plus, Trash2, GripVertical, Loader2, ExternalLink, Copy, Check, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ROOM_LABELS = [
  'Sala', 'Comedor', 'Cocina', 'Habitación principal', 'Habitación 2',
  'Habitación 3', 'Habitación 4', 'Baño principal', 'Baño 2',
  'Terraza', 'Balcón', 'Garaje', 'Estudio', 'Piscina', 'Jardín',
  'Área de servicio', 'Fachada', 'Vista', 'Otro',
]

interface Props {
  propertyId: string
  rooms: TourRoom[]
  onSave: (rooms: TourRoom[]) => Promise<void>
}

export function TourUploader({ propertyId, rooms: initial, onSave }: Props) {
  const [rooms, setRooms]     = useState<TourRoom[]>(initial)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [copied, setCopied]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const appUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : ''
  const tourUrl   = `${appUrl}/tour/${propertyId}`
  const embedCode = `<iframe src="${tourUrl}?embed=true" width="100%" height="520" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe>`

  async function handleFiles(files: FileList) {
    setUploading(true)
    const uploaded: TourRoom[] = []

    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (res.ok) {
          const { url } = await res.json()
          const label = ROOM_LABELS[rooms.length + uploaded.length] ?? 'Otro'
          uploaded.push({ url, label })
        }
      } catch { /* silently skip failed uploads */ }
    }

    setRooms((prev) => [...prev, ...uploaded])
    setUploading(false)
    setSaved(false)
  }

  function updateLabel(idx: number, label: string) {
    setRooms((prev) => prev.map((r, i) => i === idx ? { ...r, label } : r))
    setSaved(false)
  }

  function toggle360(idx: number) {
    setRooms((prev) => prev.map((r, i) => i === idx ? { ...r, is360: !r.is360 } : r))
    setSaved(false)
  }

  function remove(idx: number) {
    setRooms((prev) => prev.filter((_, i) => i !== idx))
    setSaved(false)
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setRooms((prev) => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
    setSaved(false)
  }

  function moveDown(idx: number) {
    setRooms((prev) => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    await onSave(rooms)
    setSaving(false)
    setSaved(true)
  }

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files) }}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo fotos…
          </div>
        ) : (
          <>
            <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Agregar fotos del tour</p>
            <p className="text-xs text-muted-foreground mt-1">Arrastra o haz clic · JPG, PNG · Fotos regulares o panorámicas 360°</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files) }}
        />
      </div>

      {/* Room list */}
      {rooms.length > 0 && (
        <div className="space-y-2">
          {rooms.map((room, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2 bg-card">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(i)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none text-xs">▲</button>
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                <button onClick={() => moveDown(i)} disabled={i === rooms.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none text-xs">▼</button>
              </div>

              <div className="relative h-14 w-20 rounded-md overflow-hidden shrink-0 bg-muted">
                <img src={room.url} alt={room.label} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <Select value={room.label} onValueChange={(v) => { if (v) updateLabel(i, v) }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_LABELS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={() => toggle360(i)}
                title={room.is360 ? 'Foto 360° — clic para cambiar a regular' : 'Marcar como foto 360°'}
                className={`p-1.5 rounded-md transition shrink-0 text-xs font-bold ${
                  room.is360
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <ScanLine className="h-4 w-4" />
              </button>

              <button onClick={() => remove(i)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Save */}
      {(rooms.length > 0 || initial.length > 0) && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">{rooms.length} habitación{rooms.length !== 1 ? 'es' : ''}</p>
          <Button size="sm" onClick={handleSave} disabled={saving || saved}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {saved ? <><Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />Guardado</> : 'Guardar tour'}
          </Button>
        </div>
      )}

      {/* Public links — only when tour has rooms */}
      {rooms.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compartir y publicar</p>

          {/* Share link */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono text-muted-foreground truncate">
              {tourUrl}
            </div>
            <a href={tourUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir
              </Button>
            </a>
          </div>

          {/* Embed code */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Código para tu sitio web:</p>
            <div className="relative">
              <pre className="rounded-md border border-border bg-muted p-3 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {embedCode}
              </pre>
              <button
                onClick={copyEmbed}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-background border border-border hover:bg-muted transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
