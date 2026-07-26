'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { ContactsTable } from '@/components/crm/ContactsTable'
import { ContactsFilterBar, EMPTY_FILTERS, ContactFilters, applyFilters } from '@/components/crm/ContactsFilterBar'
import { Contact, CrmStage, Pipeline } from '@/lib/types'
import { Plus, Download, Upload, Settings2, LayoutGrid, Rows3 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

type ViewMode = 'tabla' | 'kanban'

function CrmPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stageParam    = searchParams.get('stage')
  const pipelineParam = searchParams.get('pipeline')

  const [stages, setStages]         = useState<CrmStage[]>([])
  const [pipelines, setPipelines]   = useState<Pipeline[]>([])
  const [contacts, setContacts]     = useState<Contact[]>([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState<ViewMode>('tabla')
  const [filters, setFilters]       = useState<ContactFilters>(EMPTY_FILTERS)
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null)
  const [isOwner, setIsOwner]       = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setIsOwner(d?.rol === 'owner'))
      .catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    const [stagesRes, contactsRes, pipelinesRes] = await Promise.all([
      fetch('/api/crm/stages'),
      fetch('/api/crm/contacts?limit=500'),
      fetch('/api/crm/pipelines'),
    ])
    const stagesData    = await stagesRes.json()
    const contactsData  = await contactsRes.json()
    const pipelinesData = await pipelinesRes.json()
    setStages(stagesData)
    // Owners live in their own /propietarios section — keep the CRM to leads.
    setContacts((contactsData.contacts ?? []).filter((c: Contact) => c.tipo !== 'propietario'))
    setPipelines(pipelinesData)
    // Default to first pipeline
    if (pipelinesData.length > 0) {
      const target = pipelineParam
        ? pipelinesData.find((p: Pipeline) => p.slug === pipelineParam)
        : null
      setActivePipelineId(target?.id ?? pipelinesData[0].id)
    }
    setLoading(false)
  }, [pipelineParam])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (stageParam && stages.length > 0) {
      setFilters((prev) => ({ ...prev, stage: stageParam }))
    }
  }, [stageParam, stages])

  // Stages visible in the selected pipeline
  const pipelineStages = activePipelineId
    ? stages.filter((s) => s.pipeline_id === activePipelineId)
    : stages

  const pipelineStageSlugs = new Set(pipelineStages.map((s) => s.slug))

  // Contacts that belong to the active pipeline (via their stage)
  const pipelineContacts = activePipelineId
    ? contacts.filter((c) => pipelineStageSlugs.has(c.etapa_crm))
    : contacts

  const allTags = Array.from(new Set(pipelineContacts.flatMap((c) => c.tags ?? []))).sort()
  const filtered = applyFilters(pipelineContacts, filters)

  function handleContactUpdate(id: string, patch: Partial<Contact>) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  if (loading) {
    // Skeletons rather than a "Cargando…" line: the layout lands in its final
    // shape, so nothing jumps when the data arrives.
    return (
      <div className="flex flex-col h-full" aria-busy="true" aria-live="polite">
        <span className="sr-only">Cargando CRM…</span>
        <div className="border-b border-border px-6 pt-3">
          <div className="flex gap-6 pb-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-28" />)}
          </div>
        </div>
        <div className="border-b border-border px-6 py-4 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-44" />
          </div>
        </div>
        <div className="flex-1 p-4 md:p-6 space-y-2">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Pipeline tabs ──────────────────────────────────────────── */}
      {pipelines.length > 0 && (
        <div className="border-b border-border bg-background px-4 md:px-6 pt-3">
          {/* Scrollable on narrow screens — four pipelines do not fit across a
              phone, and a wrapped tab row breaks the underline baseline. */}
          <div className="flex gap-0 overflow-x-auto" role="tablist" aria-label="Pipelines">
            {pipelines.map((p) => {
              const isActive = p.id === activePipelineId
              return (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActivePipelineId(p.id)
                    setFilters(EMPTY_FILTERS)
                  }}
                  className={`relative flex items-center gap-2 shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                    isActive
                      ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                    aria-hidden="true"
                  />
                  {p.nombre}
                  <span className="text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded-full">
                    {contacts.filter((c) =>
                      stages.filter((s) => s.pipeline_id === p.id).some((s) => s.slug === c.etapa_crm)
                    ).length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-border px-4 md:px-6 py-4 min-w-0">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4 min-w-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {pipelines.find((p) => p.id === activePipelineId)?.nombre ?? 'Contactos'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length === pipelineContacts.length
                ? `${pipelineContacts.length} contacto${pipelineContacts.length === 1 ? '' : 's'}`
                : `${filtered.length} de ${pipelineContacts.length} contacto${pipelineContacts.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher */}
            <div className="inline-flex h-9 rounded-md border border-border bg-card p-0.5">
              <button
                onClick={() => setView('tabla')}
                className={`inline-flex items-center gap-1.5 px-3 rounded text-xs font-medium transition-colors ${
                  view === 'tabla' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Rows3 className="h-3.5 w-3.5" /> Tabla
              </button>
              <button
                onClick={() => setView('kanban')}
                className={`inline-flex items-center gap-1.5 px-3 rounded text-xs font-medium transition-colors ${
                  view === 'kanban' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
              </button>
            </div>

            {isOwner && (
              <a href="/api/crm/contacts/export?format=csv">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Exportar CSV
                </Button>
              </a>
            )}
            <Link href="/crm/importar">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                Importar
              </Button>
            </Link>
            <Link href="/configuracion/crm">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <Settings2 className="h-3.5 w-3.5" />
                Pipelines
              </Button>
            </Link>
            <Link href="/crm/nuevo">
              <Button size="sm" className="h-9 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Nuevo contacto
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter bar — scoped to pipeline stages */}
        <ContactsFilterBar
          filters={filters}
          onChange={setFilters}
          stages={pipelineStages}
          allTags={allTags}
        />
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      {/* Kanban pins vertically and scrolls only sideways (its lanes scroll
          their own cards internally), so the board frame never drifts up/down.
          The table view keeps normal vertical page scroll. */}
      <div
        className={`flex-1 min-h-0 min-w-0 ${
          view === 'kanban'
            ? 'overflow-hidden p-4 md:p-6 pb-2'
            : 'overflow-y-auto overflow-x-hidden p-4 md:p-6'
        }`}
      >
        {pipelineStages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-muted-foreground text-sm">
              No hay etapas configuradas en este pipeline.
            </p>
            <Link href="/configuracion/crm">
              <Button size="sm">Configurar etapas</Button>
            </Link>
          </div>
        ) : view === 'tabla' ? (
          <ContactsTable
            contacts={filtered}
            stages={pipelineStages}
            filtered={filtered.length !== pipelineContacts.length}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
          />
        ) : (
          <KanbanBoard
            stages={pipelineStages}
            contacts={filtered}
            onContactUpdate={handleContactUpdate}
            onOpenContact={(c) => router.push(`/crm/${c.id}`)}
          />
        )}
      </div>
    </div>
  )
}

export default function CrmPage() {
  return (
    <Suspense>
      <CrmPageContent />
    </Suspense>
  )
}
