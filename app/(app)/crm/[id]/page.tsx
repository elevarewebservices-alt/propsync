'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Mail, Phone, MessageCircle, Calendar, MapPin, Tag, Zap, AlertTriangle, Sparkles,
} from 'lucide-react'
import { Contact, CrmStage } from '@/lib/types'
import { ContactInfoTab } from '@/components/crm/detail/ContactInfoTab'
import { ContactInteresTab } from '@/components/crm/detail/ContactInteresTab'
import { ContactPropertiesTab } from '@/components/crm/detail/ContactPropertiesTab'
import { ContactNotesTab } from '@/components/crm/detail/ContactNotesTab'
import { ContactActivityTab } from '@/components/crm/detail/ContactActivityTab'
import { ContactMatchesTab } from '@/components/crm/detail/ContactMatchesTab'
import { PipelineFunnelBar } from '@/components/crm/PipelineFunnelBar'
import { Skeleton } from '@/components/ui/skeleton'
import { avatarBg, initials, tipoBadge } from '@/lib/crm-colors'

interface LinkedProperty {
  id: string
  contact_id: string
  property_id: string
  interes: string
  created_at: string
  properties?: {
    id: string
    titulo: string
    precio: number
    ciudad: string | null
    bedrooms: number | null
    main_image_url: string | null
  }
}

export default function ContactDetailPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const id      = params.id

  const [contact, setContact]     = useState<Contact | null>(null)
  const [stages, setStages]       = useState<CrmStage[]>([])
  const [linked, setLinked]       = useState<LinkedProperty[]>([])
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [actionError, setActionError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [contactRes, stagesRes] = await Promise.all([
      fetch(`/api/crm/contacts/${id}`),
      fetch('/api/crm/stages'),
    ])
    if (!contactRes.ok) {
      setNotFound(true)
      setLoading(false)
      return
    }
    const data = await contactRes.json()
    const stagesData = await stagesRes.json()
    setContact(data.contact)
    setLinked(data.linked_properties ?? [])
    setStages(stagesData)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  function handleUpdate(updated: Contact) {
    setContact(updated)
  }

  async function handleStageChange(slug: string) {
    if (!contact) return
    const prev = contact
    setContact({ ...contact, etapa_crm: slug })   // optimistic
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa_crm: slug }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setContact(await res.json())
    } catch {
      // The bar used to snap back with no explanation, which reads as a UI bug
      // rather than a failed save.
      setContact(prev)
      setActionError('No se pudo cambiar la etapa. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  async function handleDeactivate() {
    if (!contact) return
    setDeactivating(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/contacts/${contact.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(String(res.status))
      router.push('/crm')
    } catch {
      // Previously a failed DELETE did nothing at all — the dialog just sat there.
      setDeactivating(false)
      setConfirmOpen(false)
      setActionError('No se pudo desactivar el contacto. Inténtalo de nuevo.')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full" aria-busy="true" aria-live="polite">
        <span className="sr-only">Cargando contacto…</span>
        <div className="border-b border-border px-6 py-3 flex items-center justify-between">
          <Skeleton className="h-8 w-28" />
          <div className="hidden sm:flex gap-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-24" />)}
          </div>
        </div>
        <div className="border-b border-border px-6 py-5 bg-muted/20">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-6 w-48 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mt-6 rounded-full" />
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-24" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (notFound || !contact) {
    return (
      <div className="max-w-md mx-auto px-6 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
        <h1 className="text-lg font-semibold mb-2">Contacto no encontrado</h1>
        <p className="text-sm text-muted-foreground mb-4">El contacto que buscas no existe o fue eliminado.</p>
        <Link href="/crm"><Button>Regresar al CRM</Button></Link>
      </div>
    )
  }

  const currentStage = stages.find((s) => s.slug === contact.etapa_crm)
  // Scope the funnel to the contact's own pipeline — position resets per pipeline,
  // so mixing stages across pipelines would render a scrambled bar. Discard-type
  // stages are excluded from the thermometer itself (still available as Kanban
  // columns) since they're dead ends, not forward progress.
  const HIDDEN_FROM_FUNNEL = new Set(['descartado', 'basurero'])
  const pipelineStages = (currentStage
    ? stages.filter((s) => s.pipeline_id === currentStage.pipeline_id)
    : stages
  ).filter((s) => !HIDDEN_FROM_FUNNEL.has(s.slug))
  const today = new Date().toISOString().slice(0, 10)
  const overdue = contact.fecha_seguimiento && contact.fecha_seguimiento < today

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar with back + actions ───────────────────────────────── */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <Link href="/crm">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Contactos
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {contact.telefono && (
            <a href={`tel:${contact.telefono}`}>
              <Button variant="outline" size="sm" className="gap-1.5 h-11 md:h-8 text-xs">
                <Phone className="h-3.5 w-3.5" /> Llamar
              </Button>
            </a>
          )}
          {contact.whatsapp && (
            <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 h-11 md:h-8 text-xs">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`}>
              <Button variant="outline" size="sm" className="gap-1.5 h-11 md:h-8 text-xs">
                <Mail className="h-3.5 w-3.5" /> Email
              </Button>
            </a>
          )}
          {contact.fecha_seguimiento && (() => {
            const d = contact.fecha_seguimiento.replace(/-/g, '')
            const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Seguimiento: ${contact.nombre}`)}&dates=${d}/${d}&details=${encodeURIComponent(`Seguimiento CRM PropSync\nContacto: ${contact.nombre}${contact.telefono ? `\nTeléfono: ${contact.telefono}` : ''}`)}`
            return (
              <a href={gcal} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 h-11 md:h-8 text-xs">
                  <Calendar className="h-3.5 w-3.5" /> Agendar
                </Button>
              </a>
            )
          })()}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-11 md:h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
            onClick={() => setConfirmOpen(true)}
            disabled={deactivating}
          >
            Desactivar
          </Button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mx-6 mt-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-md px-3 py-2"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {actionError}
        </div>
      )}

      {/* In-app confirm — window.confirm() renders as a raw browser dialog inside
          the Capacitor WebView, which breaks the native feel of the app shell. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Desactivar a {contact.nombre}?</DialogTitle>
            <DialogDescription>
              El contacto deja de aparecer en el CRM, pero no se borra: su historial y sus notas se
              conservan y podrás reactivarlo desde la base de datos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deactivating}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              {deactivating ? 'Desactivando…' : 'Desactivar contacto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Identity card ─────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-5 bg-muted/20">
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-semibold ${avatarBg(contact.nombre)}`}>
            {initials(contact.nombre)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight">{contact.nombre}</h1>
              <Badge variant="outline" className={`text-xs capitalize border ${tipoBadge(contact.tipo)}`}>
                {contact.tipo}
              </Badge>
              {contact.fuente === 'meta_leads' && (
                <Badge className="bg-blue-100 text-blue-700 border-0 text-xs gap-1 dark:bg-blue-900/40 dark:text-blue-300">
                  <Zap className="h-3 w-3" /> Meta
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
              {contact.email && (
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {contact.email}</span>
              )}
              {contact.telefono && (
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {contact.telefono}</span>
              )}
              {contact.ciudad && (
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {contact.ciudad}</span>
              )}
            </div>
            {/* Immutable registered date */}
            <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground bg-card border border-border rounded-full px-2.5 py-1">
              <Calendar className="h-3 w-3" />
              Registrado el {new Date(contact.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="text-muted-foreground/70 ml-1">· no editable</span>
            </div>
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-w-xs">
              {contact.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-card border border-border">
                  <Tag className="h-2.5 w-2.5 text-muted-foreground" /> {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Funnel del pipeline — barra horizontal que se va llenando */}
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Etapa del pipeline</div>
          <PipelineFunnelBar stages={pipelineStages} currentSlug={contact.etapa_crm} onChange={handleStageChange} />
        </div>

        {overdue && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Seguimiento vencido desde el {new Date(contact.fecha_seguimiento!).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>

      {/* ── Tabbed content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="info" className="p-6">
          <TabsList className="mb-6 w-full justify-start overflow-x-auto flex-nowrap gap-1">
            <TabsTrigger value="info" className="shrink-0 flex-none">Información</TabsTrigger>
            <TabsTrigger value="interes" className="shrink-0 flex-none">Interés</TabsTrigger>
            <TabsTrigger value="matches" className="shrink-0 flex-none gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="propiedades" className="shrink-0 flex-none">
              Propiedades
              {linked.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-muted text-foreground text-[10px] font-semibold">
                  {linked.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notas" className="shrink-0 flex-none">Notas</TabsTrigger>
            <TabsTrigger value="actividad" className="shrink-0 flex-none">Actividad</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <ContactInfoTab contact={contact} onUpdate={handleUpdate} />
          </TabsContent>
          <TabsContent value="interes">
            <ContactInteresTab contact={contact} onUpdate={handleUpdate} />
          </TabsContent>
          <TabsContent value="matches">
            <ContactMatchesTab contact={contact} />
          </TabsContent>
          <TabsContent value="propiedades">
            <ContactPropertiesTab contact={contact} linked={linked} onReload={load} />
          </TabsContent>
          <TabsContent value="notas">
            <ContactNotesTab contact={contact} />
          </TabsContent>
          <TabsContent value="actividad">
            <ContactActivityTab contact={contact} currentStage={currentStage} linkedCount={linked.length} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
