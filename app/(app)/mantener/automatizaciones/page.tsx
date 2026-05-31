'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Automation, AutomationAction, CrmStage } from '@/lib/types'
import {
  Plus, Zap, Pencil, Trash2, Play, Clock, AlertCircle, CheckCircle2, Loader2, Lock,
} from 'lucide-react'
import Link from 'next/link'

const TRIGGER_LABELS: Record<string, string> = {
  nuevo_lead:       'Nuevo lead (hace X días)',
  sin_respuesta:    'Sin respuesta en X días',
  follow_up_vencido: 'Follow-up vencido',
}

const ACTION_LABELS: Record<string, string> = {
  enviar_email:   'Enviar email',
  cambiar_etapa:  'Cambiar etapa',
  asignar_agente: 'Asignar agente',
  crear_nota:     'Crear nota',
}

interface AgentOption { id: string; nombre: string }

function AutomationSheet({
  open, onClose, initial, stages, agents, onSaved,
}: {
  open: boolean
  onClose: () => void
  initial: Automation | null
  stages: CrmStage[]
  agents: AgentOption[]
  onSaved: (a: Automation) => void
}) {
  const [nombre, setNombre] = useState('')
  const [triggerType, setTriggerType] = useState<string>('sin_respuesta')
  const [dias, setDias] = useState(3)
  const [actions, setActions] = useState<AutomationAction[]>([{ type: 'crear_nota', config: { nota: 'Sin respuesta — seguimiento automático' } }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initial) {
      setNombre(initial.nombre)
      setTriggerType(initial.trigger_type)
      setDias(initial.trigger_config?.dias ?? 3)
      setActions(initial.actions)
    } else {
      setNombre('')
      setTriggerType('sin_respuesta')
      setDias(3)
      setActions([{ type: 'crear_nota', config: { nota: '' } }])
    }
    setError('')
  }, [initial, open])

  function addAction() {
    setActions((prev) => [...prev, { type: 'enviar_email', config: { asunto: '', cuerpo: '' } }])
  }

  function removeAction(idx: number) {
    setActions((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateAction(idx: number, patch: Partial<AutomationAction>) {
    setActions((prev) => prev.map((a, i) => i === idx ? { ...a, ...patch } : a))
  }

  async function handleSave() {
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    if (!actions.length) { setError('Agrega al menos una acción'); return }
    setSaving(true); setError('')
    try {
      const url = initial ? `/api/automations/${initial.id}` : '/api/automations'
      const method = initial ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          trigger_type: triggerType,
          trigger_config: ['nuevo_lead', 'sin_respuesta'].includes(triggerType) ? { dias } : {},
          conditions: [],
          actions,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error') }
      const saved: Automation = await res.json()
      onSaved(saved)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{initial ? 'Editar automatización' : 'Nueva automatización'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-sm mb-1.5 block">Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Recordatorio de seguimiento" className="h-9" />
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">Disparador</Label>
            <Select value={triggerType} onValueChange={(v) => { if (v) setTriggerType(v) }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {['nuevo_lead', 'sin_respuesta'].includes(triggerType) && (
            <div>
              <Label className="text-sm mb-1.5 block">Días</Label>
              <Input type="number" min={1} max={90} value={dias} onChange={(e) => setDias(Number(e.target.value))} className="h-9 w-24" />
              <p className="text-xs text-muted-foreground mt-1">
                {triggerType === 'nuevo_lead' ? 'Días desde que se creó el lead' : 'Días sin actualización en el contacto'}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Acciones</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addAction}>
                <Plus className="h-3.5 w-3.5" /> Agregar
              </Button>
            </div>
            <div className="space-y-3">
              {actions.map((action, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={action.type} onValueChange={(v) => updateAction(idx, { type: v as AutomationAction['type'], config: {} })}>
                      <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTION_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {actions.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeAction(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>

                  {action.type === 'enviar_email' && (
                    <div className="space-y-1.5">
                      <Input value={action.config.asunto ?? ''} onChange={(e) => updateAction(idx, { config: { ...action.config, asunto: e.target.value } })} placeholder="Asunto del email" className="h-8 text-xs" />
                      <textarea value={action.config.cuerpo ?? ''} onChange={(e) => updateAction(idx, { config: { ...action.config, cuerpo: e.target.value } })} placeholder="Cuerpo del email…" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-none" />
                    </div>
                  )}
                  {action.type === 'cambiar_etapa' && (
                    <Select value={action.config.etapa_slug ?? ''} onValueChange={(v) => updateAction(idx, { config: { etapa_slug: v ?? undefined } })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar etapa…" /></SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.slug} value={s.slug}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                              {s.nombre}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {action.type === 'asignar_agente' && (
                    <Select value={action.config.agente_id ?? ''} onValueChange={(v) => updateAction(idx, { config: { agente_id: v ?? undefined } })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar agente…" /></SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {action.type === 'crear_nota' && (
                    <Input value={action.config.nota ?? ''} onChange={(e) => updateAction(idx, { config: { nota: e.target.value } })} placeholder="Contenido de la nota" className="h-8 text-xs" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Guardar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function AutomatizacionesPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [stages, setStages] = useState<CrmStage[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [planId, setPlanId] = useState<string>('starter')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editItem, setEditItem] = useState<Automation | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/automations').then((r) => r.json()),
      fetch('/api/crm/stages').then((r) => r.json()),
      fetch('/api/agents').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ]).then(([autos, st, ag, me]) => {
      setAutomations(Array.isArray(autos) ? autos : [])
      setStages(st)
      setAgents(ag)
      setPlanId(me?.company?.plan_id ?? 'starter')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function toggleActive(auto: Automation) {
    const planOk = planId === 'pro' || planId === 'agency'
    if (!planOk && !auto.is_active) return // Can't re-activate without plan
    setToggling(auto.id)
    const res = await fetch(`/api/automations/${auto.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !auto.is_active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setAutomations((prev) => prev.map((a) => a.id === updated.id ? updated : a))
    }
    setToggling(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta automatización?')) return
    const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' })
    if (res.ok) setAutomations((prev) => prev.filter((a) => a.id !== id))
  }

  function handleSaved(saved: Automation) {
    setAutomations((prev) => {
      const exists = prev.find((a) => a.id === saved.id)
      return exists ? prev.map((a) => a.id === saved.id ? saved : a) : [saved, ...prev]
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Cargando…</div>
  }

  const hasAccess = planId === 'pro' || planId === 'agency'

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automatizaciones</h1>
          <p className="text-sm text-muted-foreground">Reglas que se ejecutan automáticamente sobre tus contactos</p>
        </div>
        {hasAccess && (
          <Button size="sm" className="gap-1.5" onClick={() => { setEditItem(null); setSheetOpen(true) }}>
            <Plus className="h-4 w-4" /> Nueva automatización
          </Button>
        )}
      </div>

      {!hasAccess && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-3 shrink-0">
            <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Automatizaciones requieren plan Pro</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tu plan actual (Starter) no incluye el módulo de automatizaciones. Actualiza para crear reglas de seguimiento automático, asignación de etapas y más.
            </p>
          </div>
          <Link href="/configuracion/planes">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
              Ver planes
            </Button>
          </Link>
        </div>
      )}

      {/* Info card */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
        <div className="flex gap-3 items-start">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Ejecución automática</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Las automatizaciones se evalúan diariamente vía cron. Configura el cron en Vercel/Supabase para <code className="text-xs bg-muted px-1 rounded">/api/cron/automations</code>.
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {automations.map((auto) => (
          <div key={auto.id} className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className={`mt-0.5 rounded-lg p-2 shrink-0 ${auto.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
              <Zap className={`h-4 w-4 ${auto.is_active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm text-foreground">{auto.nombre}</p>
                {auto.is_active
                  ? <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Activa</Badge>
                  : <Badge variant="secondary" className="text-[10px]">Inactiva</Badge>
                }
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {TRIGGER_LABELS[auto.trigger_type]}
                {auto.trigger_config?.dias ? ` (${auto.trigger_config.dias} días)` : ''}
                {' → '}
                {auto.actions.map((a) => ACTION_LABELS[a.type] ?? a.type).join(', ')}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Play className="h-3 w-3" /> {auto.run_count} ejecuciones
                </span>
                {auto.last_run_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Última: {new Date(auto.last_run_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={auto.is_active}
                onCheckedChange={() => toggleActive(auto)}
                disabled={toggling === auto.id}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(auto); setSheetOpen(true) }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-600"
                onClick={() => handleDelete(auto.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {automations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-xl gap-3">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay automatizaciones todavía</p>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditItem(null); setSheetOpen(true) }}>
              <Plus className="h-4 w-4" /> Crear primera automatización
            </Button>
          </div>
        )}
      </div>

      <AutomationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editItem}
        stages={stages}
        agents={agents}
        onSaved={handleSaved}
      />
    </div>
  )
}
