'use client'

import { useState, useEffect } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { CrmStage, Pipeline } from '@/lib/types'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const PRESET_COLORS = [
  '#3b82f6','#f59e0b','#8b5cf6','#f97316',
  '#22c55e','#6b7280','#ef4444','#ec4899',
]

const REQUIRED_FIELD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'telefono', label: 'Teléfono' },
  { value: 'presupuesto_min', label: 'Presupuesto mín.' },
  { value: 'zona_interes', label: 'Zona de interés' },
  { value: 'agente_nombre', label: 'Agente asignado' },
  { value: 'fecha_seguimiento', label: 'Fecha de seguimiento' },
]

interface Props {
  stage: CrmStage | null
  mode: 'create' | 'edit'
  open: boolean
  onClose: () => void
  onSaved: (stage: CrmStage) => void
  pipelines?: Pipeline[]
  defaultPipelineId?: string | null
}

export function StageSettingsSheet({ stage, mode, open, onClose, onSaved, pipelines = [], defaultPipelineId }: Props) {
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [isTerminal, setIsTerminal] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [requiredFields, setRequiredFields] = useState<string[]>([])
  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (stage && mode === 'edit') {
      setNombre(stage.nombre)
      setColor(stage.color)
      setIsTerminal(stage.is_terminal)
      setRequiresApproval(stage.requires_approval)
      setRequiredFields(stage.required_fields)
      setPipelineId(stage.pipeline_id ?? defaultPipelineId ?? null)
    } else {
      setNombre('')
      setColor('#3b82f6')
      setIsTerminal(false)
      setRequiresApproval(false)
      setRequiredFields([])
      setPipelineId(defaultPipelineId ?? null)
    }
    setSaved(false)
    setError('')
  }, [stage, mode, open, defaultPipelineId])

  function toggleField(field: string) {
    setRequiredFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  async function handleSave() {
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError('')
    try {
      const url = mode === 'edit' && stage
        ? `/api/crm/stages/${stage.id}`
        : '/api/crm/stages'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, color, is_terminal: isTerminal, requires_approval: requiresApproval, required_fields: requiredFields, pipeline_id: pipelineId }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error al guardar')
      }
      const saved = await res.json()
      onSaved(saved as CrmStage)
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{mode === 'edit' ? 'Editar etapa' : 'Nueva etapa'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-sm mb-1.5 block">Nombre de la etapa</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Pre-aprobación bancaria"
              className="h-9"
            />
          </div>

          {pipelines.length > 0 && (
            <div>
              <Label className="text-sm mb-1.5 block">Pipeline</Label>
              <Select value={pipelineId ?? ''} onValueChange={(v) => setPipelineId(v || null)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar pipeline…" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                        {p.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-sm mb-2 block">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-border"
                />
                <span className="text-xs text-muted-foreground">{color}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium">{nombre || 'Vista previa'}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Etapa terminal</Label>
                <p className="text-xs text-muted-foreground">Las etapas terminales cierran el pipeline (Cerrado, Descartado)</p>
              </div>
              <Switch checked={isTerminal} onCheckedChange={setIsTerminal} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Requiere aprobación</Label>
                <p className="text-xs text-muted-foreground">Un administrador debe aprobar el avance a esta etapa</p>
              </div>
              <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Campos requeridos para avanzar</Label>
            <div className="space-y-2">
              {REQUIRED_FIELD_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiredFields.includes(opt.value)}
                    onChange={() => toggleField(opt.value)}
                    className="rounded"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : saved ? (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
              ) : null}
              Guardar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
