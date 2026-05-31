'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bed, Bath, Car, Maximize2, MapPin,
  RefreshCw, CheckCircle2, Video, AlertCircle, Clapperboard, Pencil,
} from 'lucide-react'
import { Property, EtapaCRM, PropertyNote, TourRoom } from '@/lib/types'
import { TourUploader } from './TourUploader'
import Link from 'next/link'

function exactTime(dateStr: string): string {
  const d = new Date(dateStr)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const date = d.toLocaleDateString('es', { day: 'numeric', month: 'short', ...(!sameYear ? { year: 'numeric' } : {}) })
  const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

const ETAPAS: { value: EtapaCRM; label: string; color: string; active: string }[] = [
  { value: 'prospecto',  label: 'Prospecto',  color: 'border-slate-300 text-slate-600 hover:border-slate-400',    active: 'bg-slate-100 border-slate-500 text-slate-800 dark:bg-slate-800 dark:border-slate-400 dark:text-slate-200' },
  { value: 'contactado', label: 'Contactado', color: 'border-blue-300 text-blue-600 hover:border-blue-400',       active: 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-200' },
  { value: 'visita',     label: 'Visita',     color: 'border-amber-300 text-amber-600 hover:border-amber-400',    active: 'bg-amber-100 border-amber-500 text-amber-800 dark:bg-amber-900/40 dark:border-amber-400 dark:text-amber-200' },
  { value: 'oferta',     label: 'Oferta',     color: 'border-purple-300 text-purple-600 hover:border-purple-400', active: 'bg-purple-100 border-purple-500 text-purple-800 dark:bg-purple-900/40 dark:border-purple-400 dark:text-purple-200' },
  { value: 'negociando', label: 'Negociando', color: 'border-orange-300 text-orange-600 hover:border-orange-400', active: 'bg-orange-100 border-orange-500 text-orange-800 dark:bg-orange-900/40 dark:border-orange-400 dark:text-orange-200' },
  { value: 'cerrado',    label: 'Cerrado',    color: 'border-green-300 text-green-600 hover:border-green-400',    active: 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/40 dark:border-green-400 dark:text-green-200' },
]

interface Props {
  property: Property | null
  open: boolean
  onClose: () => void
  onSaved?: (updated: Partial<Property>) => void
}

export function PropertyDetailSheet({ property, open, onClose, onSaved }: Props) {
  const [etapa, setEtapa]               = useState<EtapaCRM>('prospecto')
  const [disponibilidad, setDisponibilidad] = useState<'disponible' | 'vendido' | 'alquilado'>('disponible')
  const [estadoPublicacion, setEstadoPublicacion] = useState<'activo' | 'destacado' | 'inactivo'>('inactivo')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteEmail, setClienteEmail]   = useState('')
  const [agente, setAgente]               = useState('')
  const [seguimiento, setSeguimiento]     = useState('')
  const [saveState, setSaveState]         = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [notes, setNotes]                 = useState<PropertyNote[]>([])
  const [newNote, setNewNote]             = useState('')
  const [postingNote, setPostingNote]     = useState(false)
  const [activeTab, setActiveTab]         = useState<'crm' | 'tour'>('crm')
  const [tourRooms, setTourRooms]         = useState<TourRoom[]>([])
  const notesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (property) {
      setEtapa(property.etapa_crm)
      setDisponibilidad(property.disponibilidad)
      setEstadoPublicacion(property.estado_publicacion)
      setClienteNombre(property.cliente_nombre ?? '')
      setClienteEmail(property.cliente_email ?? '')
      setAgente(property.agente_asignado ?? '')
      setSeguimiento(property.fecha_seguimiento ?? '')
      setSaveState('idle')
      setActiveTab('crm')
      setTourRooms(Array.isArray(property.tour_rooms) ? property.tour_rooms : [])
      setNotes([])
      setNewNote('')
      fetch(`/api/properties/${property.id}/notes`)
        .then((r) => r.ok ? r.json() : [])
        .then((data: PropertyNote[]) => {
          setNotes(data)
          setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        })
        .catch(() => {})
    }
  }, [property])

  if (!property) return null

  const displayPrice =
    property.tipo === 'venta'
      ? `$${property.precio.toLocaleString()}`
      : `$${property.precio.toLocaleString()}/mes`

  async function handleSave() {
    if (!property) return
    setSaveState('saving')

    const patch = {
      etapa_crm: etapa,
      disponibilidad,
      estado_publicacion: estadoPublicacion,
      cliente_nombre: clienteNombre || null,
      cliente_email: clienteEmail || null,
      fecha_seguimiento: seguimiento || null,
    }

    const res = await fetch(`/api/properties/${property.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })

    if (!res.ok) {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
      return
    }

    setSaveState('saved')
    onSaved?.(patch)
    setTimeout(() => setSaveState('idle'), 2000)
  }

  async function saveTourRooms(rooms: TourRoom[]) {
    if (!property) return
    setTourRooms(rooms)
    await fetch(`/api/properties/${property.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tour_rooms: rooms }),
    })
  }

  async function handleAddNote() {
    if (!property || !newNote.trim()) return
    setPostingNote(true)
    try {
      const res = await fetch(`/api/properties/${property.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: newNote.trim() }),
      })
      if (res.ok) {
        const nota: PropertyNote = await res.json()
        setNotes((prev) => [...prev, nota])
        setNewNote('')
        setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } catch {
      // silent
    } finally {
      setPostingNote(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex gap-3">
            {property.main_image?.url && (
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={property.main_image.url}
                  alt={property.titulo}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-sm font-semibold leading-snug line-clamp-2">
                {property.titulo}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {displayPrice}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {property.tipo === 'venta' ? 'Venta' : 'Arriendo'}
                </Badge>
                {property.property_type_label && (
                  <Badge variant="outline" className="text-xs">{property.property_type_label}</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                {property.bedrooms != null && <span className="flex items-center gap-0.5"><Bed className="h-3 w-3" />{property.bedrooms} hab</span>}
                {property.bathrooms != null && <span className="flex items-center gap-0.5"><Bath className="h-3 w-3" />{property.bathrooms} baños</span>}
                {property.garages != null && <span className="flex items-center gap-0.5"><Car className="h-3 w-3" />{property.garages} est</span>}
                {property.area && <span className="flex items-center gap-0.5"><Maximize2 className="h-3 w-3" />{property.area} m²</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            {property.ciudad ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {[property.zona, property.ciudad].filter(Boolean).join(', ')}
              </span>
            ) : <span />}
            <Link href={`/propiedades/${property.id}/editar`} onClick={onClose}>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <Pencil className="h-3 w-3" /> Editar
              </Button>
            </Link>
          </div>
        </SheetHeader>

        {/* Tab bar */}
        <div className="flex border-b border-border px-5 shrink-0">
          {(['crm', 'tour'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'tour' && <Clapperboard className="h-3.5 w-3.5" />}
              {tab === 'crm' ? 'CRM' : 'Tour virtual'}
              {tab === 'tour' && tourRooms.length > 0 && (
                <span className="ml-0.5 bg-blue-600 text-white text-[9px] rounded-full px-1.5 py-0.5 leading-none">
                  {tourRooms.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── Tour tab ─────────────────────────────────────── */}
          {activeTab === 'tour' && (
            <TourUploader
              propertyId={property.id}
              rooms={tourRooms}
              onSave={saveTourRooms}
            />
          )}

          {activeTab === 'crm' && <>
          {/* Estado de publicación */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Publicación</Label>
                <Select value={estadoPublicacion} onValueChange={(v) => setEstadoPublicacion((v ?? 'inactivo') as typeof estadoPublicacion)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="destacado">Destacado</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Disponibilidad</Label>
                <Select value={disponibilidad} onValueChange={(v) => setDisponibilidad((v ?? 'disponible') as typeof disponibilidad)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="alquilado">Alquilado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Pipeline CRM */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pipeline CRM</p>
            <div className="flex flex-wrap gap-1.5">
              {ETAPAS.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setEtapa(e.value)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    etapa === e.value ? e.active : e.color + ' bg-transparent'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </section>

          {/* Cliente */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</p>
            <div className="space-y-1.5">
              <Label htmlFor="cliente-nombre" className="text-xs">Nombre</Label>
              <Input id="cliente-nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Nombre del cliente…" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cliente-email" className="text-xs">Email</Label>
              <Input id="cliente-email" type="email" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} placeholder="email@ejemplo.com" className="h-8 text-sm" />
            </div>
          </section>

          {/* Gestión */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gestión</p>
            <div className="space-y-1.5">
              <Label htmlFor="agente" className="text-xs">Agente asignado</Label>
              <Input id="agente" value={agente} onChange={(e) => setAgente(e.target.value)} placeholder="Nombre del agente…" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seguimiento" className="text-xs">Próximo seguimiento</Label>
              <Input id="seguimiento" type="date" value={seguimiento} onChange={(e) => setSeguimiento(e.target.value)} className="h-8 text-sm" />
            </div>
          </section>

          {/* Detalles (read-only) */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalles</p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
              {property.address && <p><span className="text-muted-foreground">Dirección:</span> {property.address}</p>}
              {property.property_condition_label && <p><span className="text-muted-foreground">Condición:</span> {property.property_condition_label}</p>}
              {property.furnished != null && <p><span className="text-muted-foreground">Amoblado:</span> {property.furnished ? 'Sí' : 'No'}</p>}
              {property.maintenance_fee != null && property.maintenance_fee > 0 && (
                <p><span className="text-muted-foreground">Mantenimiento:</span> ${property.maintenance_fee.toLocaleString()}/mes</p>
              )}
              {property.visits != null && <p><span className="text-muted-foreground">Visitas en portal:</span> {property.visits}</p>}
              {property.video && (
                <a href={property.video} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                  <Video className="h-3 w-3" /> Ver video
                </a>
              )}
            </div>
            {property.features && (
              <div className="space-y-1.5">
                {property.features.internal.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {property.features.internal.map((f) => <Badge key={f.id} variant="secondary" className="text-[10px]">{f.nombre}</Badge>)}
                  </div>
                )}
                {property.features.external.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {property.features.external.map((f) => <Badge key={f.id} variant="outline" className="text-[10px]">{f.nombre}</Badge>)}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Notas */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notas internas</p>
            <div className="rounded-lg border border-border bg-muted/20 max-h-52 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Aún no hay notas.</p>
              ) : (
                <div className="divide-y divide-border">
                  {notes.map((n) => (
                    <div key={n.id} className="px-3 py-2.5 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-foreground">{n.agent_nombre}</span>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-muted-foreground block">{exactTime(n.created_at)}</span>
                          <span className="text-[9px] text-muted-foreground/60 block">{relativeTime(n.created_at)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{n.contenido}</p>
                    </div>
                  ))}
                  <div ref={notesEndRef} />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote() }}
                rows={2}
                placeholder="Escribe una nota… (Ctrl+Enter para enviar)"
                className="text-sm resize-none"
              />
              <div className="flex justify-end">
                <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleAddNote} disabled={postingNote || !newNote.trim()}>
                  {postingNote ? 'Guardando…' : 'Agregar nota'}
                </Button>
              </div>
            </div>
          </section>
          </> /* end activeTab === 'crm' */}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 min-w-24"
            onClick={handleSave}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saved'  && <><CheckCircle2 className="h-4 w-4" /> Guardado</>}
            {saveState === 'error'  && <><AlertCircle className="h-4 w-4" /> Error</>}
            {saveState === 'saving' && <><RefreshCw className="h-4 w-4 animate-spin" /> Guardando…</>}
            {saveState === 'idle'   && 'Guardar'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
