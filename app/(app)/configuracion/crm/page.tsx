'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StageSettingsSheet } from '@/components/crm/StageSettingsSheet'
import { CrmStage, Pipeline } from '@/lib/types'
import {
  Plus, Pencil, Trash2, Copy, Check, GripVertical,
  ChevronUp, ChevronDown, Loader2,
} from 'lucide-react'

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#f97316', '#ef4444', '#ec4899', '#6b7280',
]

export default function CrmConfigPage() {
  const [stages, setStages]                 = useState<CrmStage[]>([])
  const [pipelines, setPipelines]           = useState<Pipeline[]>([])
  const [loading, setLoading]               = useState(true)
  const [sheetOpen, setSheetOpen]           = useState(false)
  const [editStage, setEditStage]           = useState<CrmStage | null>(null)
  const [sheetMode, setSheetMode]           = useState<'create' | 'edit'>('create')
  const [sheetPipelineId, setSheetPipelineId] = useState<string | null>(null)
  const [deleteError, setDeleteError]       = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl]         = useState('')
  const [copied, setCopied]                 = useState(false)
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null)

  // New pipeline form state
  const [newPipelineName, setNewPipelineName] = useState('')
  const [newPipelineColor, setNewPipelineColor] = useState('#3b82f6')
  const [addingPipeline, setAddingPipeline] = useState(false)
  const [pipelineError, setPipelineError]   = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/crm/stages').then((r) => r.json()),
      fetch('/api/crm/pipelines').then((r) => r.json()),
    ]).then(([stagesData, pipelinesData]: [CrmStage[], Pipeline[]]) => {
      setStages(stagesData)
      setPipelines(pipelinesData)
      if (pipelinesData.length > 0) setActivePipelineId(pipelinesData[0].id)
      setLoading(false)
    }).catch(() => setLoading(false))

    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/meta-leads?token=TU_TOKEN_AQUI`)
    }
  }, [])

  // ── Pipeline actions ────────────────────────────────────────────────────────

  async function handleAddPipeline() {
    if (!newPipelineName.trim()) { setPipelineError('Nombre requerido'); return }
    setAddingPipeline(true)
    setPipelineError('')
    try {
      const res = await fetch('/api/crm/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newPipelineName.trim(), color: newPipelineColor }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error') }
      const created: Pipeline = await res.json()
      setPipelines((prev) => [...prev, created])
      setActivePipelineId(created.id)
      setNewPipelineName('')
      setNewPipelineColor('#3b82f6')
    } catch (e: unknown) {
      setPipelineError(e instanceof Error ? e.message : 'Error')
    } finally {
      setAddingPipeline(false)
    }
  }

  async function handleDeletePipeline(pipeline: Pipeline) {
    const res = await fetch(`/api/crm/pipelines/${pipeline.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      setDeleteError(d.error ?? 'Error al eliminar pipeline')
      return
    }
    const remaining = pipelines.filter((p) => p.id !== pipeline.id)
    setPipelines(remaining)
    if (activePipelineId === pipeline.id) setActivePipelineId(remaining[0]?.id ?? null)
  }

  // ── Stage actions ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditStage(null)
    setSheetMode('create')
    setSheetPipelineId(activePipelineId)
    setSheetOpen(true)
  }

  function openEdit(stage: CrmStage) {
    setEditStage(stage)
    setSheetMode('edit')
    setSheetPipelineId(stage.pipeline_id ?? activePipelineId)
    setSheetOpen(true)
  }

  function handleSaved(saved: CrmStage) {
    if (sheetMode === 'edit') {
      setStages((prev) => prev.map((s) => (s.id === saved.id ? saved : s)))
    } else {
      setStages((prev) => [...prev, saved])
    }
  }

  async function handleDeleteStage(stage: CrmStage) {
    setDeleteError(null)
    const res = await fetch(`/api/crm/stages/${stage.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      setDeleteError(d.error ?? 'Error al eliminar')
      return
    }
    setStages((prev) => prev.filter((s) => s.id !== stage.id))
  }

  async function handleMoveStage(stage: CrmStage, direction: 'up' | 'down') {
    const pipelineStages = stages.filter((s) => s.pipeline_id === activePipelineId)
    const idx = pipelineStages.findIndex((s) => s.id === stage.id)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= pipelineStages.length) return

    const a = pipelineStages[idx]
    const b = pipelineStages[targetIdx]
    const newA = { ...a, position: b.position }
    const newB = { ...b, position: a.position }

    setStages((prev) =>
      prev.map((s) => (s.id === newA.id ? newA : s.id === newB.id ? newB : s))
    )
    await Promise.all([
      fetch(`/api/crm/stages/${newA.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: newA.position }),
      }),
      fetch(`/api/crm/stages/${newB.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: newB.position }),
      }),
    ])
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Cargando…</div>
  }

  const activePipelineStages = stages
    .filter((s) => s.pipeline_id === activePipelineId)
    .sort((a, b) => a.position - b.position)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Configuración del CRM</h1>
        <p className="text-sm text-muted-foreground">Administra pipelines, etapas y la integración con Meta Lead Ads</p>
      </div>

      {/* ── Pipelines ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-4">Pipelines</h2>

        <div className="flex gap-2 flex-wrap mb-4">
          {pipelines.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <button
                onClick={() => setActivePipelineId(p.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  p.id === activePipelineId
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.nombre}
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-normal text-muted-foreground">
                  {stages.filter((s) => s.pipeline_id === p.id).length} etapas
                </span>
              </button>
              {pipelines.length > 1 && (
                <button
                  onClick={() => handleDeletePipeline(p)}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                  title="Eliminar pipeline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add pipeline form */}
        <div className="flex items-end gap-2 rounded-xl border border-dashed border-border bg-card/50 p-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground">Nuevo pipeline</label>
            <Input
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPipeline()}
              placeholder="Ej: Proyectos, Comercial…"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground block">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewPipelineColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    newPipelineColor === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={handleAddPipeline} disabled={addingPipeline}>
            {addingPipeline ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Agregar
          </Button>
        </div>
        {pipelineError && (
          <p className="mt-2 text-sm text-red-500">{pipelineError}</p>
        )}
      </section>

      {/* ── Pipeline stages ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">
              Etapas —{' '}
              <span style={{ color: pipelines.find((p) => p.id === activePipelineId)?.color }}>
                {pipelines.find((p) => p.id === activePipelineId)?.nombre ?? ''}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              {activePipelineStages.length} etapa{activePipelineStages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreate} disabled={!activePipelineId}>
            <Plus className="h-4 w-4" />
            Agregar etapa
          </Button>
        </div>

        {deleteError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {deleteError}
          </div>
        )}

        <div className="space-y-2">
          {activePipelineStages.map((stage, idx) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
              <span className="font-medium text-sm flex-1">{stage.nombre}</span>

              <div className="flex items-center gap-1.5">
                {stage.is_terminal && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Terminal</Badge>
                )}
                {stage.requires_approval && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Aprobación</Badge>
                )}
                {stage.required_fields.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {stage.required_fields.length} campo{stage.required_fields.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveStage(stage, 'up')} disabled={idx === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveStage(stage, 'down')} disabled={idx === activePipelineStages.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(stage)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleDeleteStage(stage)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {activePipelineStages.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              No hay etapas en este pipeline. Agrega una para empezar.
            </div>
          )}
        </div>
      </section>

      {/* ── Meta Lead Ads ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-1">Meta Lead Ads</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Conecta PropSync con Facebook e Instagram para recibir leads automáticamente.
        </p>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Tu URL de webhook</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono break-all">
                {webhookUrl}
              </code>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={handleCopyUrl}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Tu token único se configura en el panel de Supabase (companies.meta_webhook_token).
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium mb-3">Cómo configurar (3 pasos)</p>
            <ol className="space-y-3">
              {[
                { num: 1, title: 'Copia la URL de arriba', desc: 'Haz clic en "Copiar" para copiar tu URL de webhook.' },
                { num: 2, title: 'Abre Meta Business Manager', desc: 'Ve a Meta Business Suite → Formularios de contacto → Webhooks → Nuevo webhook.' },
                { num: 3, title: 'Pega la URL y suscríbete', desc: 'Pega la URL, usa el mismo token del URL como "token de verificación" y suscríbete al evento "leadgen".' },
              ].map((step) => (
                <li key={step.num} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
                    {step.num}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <StageSettingsSheet
        stage={editStage}
        mode={sheetMode}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={handleSaved}
        pipelines={pipelines}
        defaultPipelineId={sheetPipelineId}
      />
    </div>
  )
}
