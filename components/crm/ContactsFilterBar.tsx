'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from '@/components/ui/dropdown-menu'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { CrmStage } from '@/lib/types'

export interface ContactFilters {
  search:           string
  tipo:             string         // all | cliente | propietario | broker
  stage:            string         // all | <stage slug>
  fuente:           string         // all | manual | meta_leads | web_form | referido | wasi
  tipo_operacion:   string         // all | compra | alquiler | ambas
  agente:           string         // free text
  tag:              string         // all | <tag>
  ciudad:           string
  zona:             string
  presupuestoMin:   string
  presupuestoMax:   string
  followupBefore:   string         // YYYY-MM-DD
  followupAfter:    string
  createdAfter:     string
  createdBefore:    string
  onlyDueFollowups: boolean
}

export const EMPTY_FILTERS: ContactFilters = {
  search: '', tipo: 'all', stage: 'all', fuente: 'all', tipo_operacion: 'all',
  agente: '', tag: 'all', ciudad: '', zona: '',
  presupuestoMin: '', presupuestoMax: '',
  followupBefore: '', followupAfter: '',
  createdAfter: '', createdBefore: '',
  onlyDueFollowups: false,
}

interface Props {
  filters: ContactFilters
  onChange: (next: ContactFilters) => void
  stages: CrmStage[]
  allTags: string[]
}

/**
 * Zoho-style filter bar: 4 main filters always visible, the rest behind
 * a "Más filtros" dropdown. Counts active advanced filters so the user
 * sees at a glance whether deeper filters are applied.
 */
export function ContactsFilterBar({ filters, onChange, stages, allTags }: Props) {
  const set = <K extends keyof ContactFilters>(k: K, v: ContactFilters[K]) =>
    onChange({ ...filters, [k]: v })

  const activeAdvancedCount = [
    filters.fuente !== 'all',
    filters.tipo_operacion !== 'all',
    filters.agente !== '',
    filters.tag !== 'all',
    filters.ciudad !== '',
    filters.zona !== '',
    filters.presupuestoMin !== '',
    filters.presupuestoMax !== '',
    filters.followupBefore !== '',
    filters.followupAfter !== '',
    filters.createdAfter !== '',
    filters.createdBefore !== '',
    filters.onlyDueFollowups,
  ].filter(Boolean).length

  const hasAnyFilter =
    activeAdvancedCount > 0 ||
    filters.search !== '' || filters.tipo !== 'all' || filters.stage !== 'all'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Buscar por nombre, email o teléfono…"
          className="h-9 pl-8 w-72 text-sm"
        />
      </div>

      {/* Tipo */}
      <Select value={filters.tipo} onValueChange={(v) => set('tipo', v ?? 'all')}>
        <SelectTrigger className="h-9 w-40 text-sm">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="cliente">Cliente</SelectItem>
          <SelectItem value="broker">Broker</SelectItem>
        </SelectContent>
      </Select>

      {/* Etapa */}
      <Select value={filters.stage} onValueChange={(v) => set('stage', v ?? 'all')}>
        <SelectTrigger className="h-9 w-44 text-sm">
          <SelectValue placeholder="Etapa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las etapas</SelectItem>
          {stages.map((s) => (
            <SelectItem key={s.slug} value={s.slug}>{s.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Más filtros dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-sm hover:bg-accent transition-colors cursor-pointer relative">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Más filtros
            {activeAdvancedCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {activeAdvancedCount}
              </span>
            )}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[28rem] p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block text-muted-foreground">Fuente</Label>
              <Select value={filters.fuente} onValueChange={(v) => set('fuente', v ?? 'all')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fuentes</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="referido">Referido</SelectItem>
                  <SelectItem value="web_form">Formulario web</SelectItem>
                  <SelectItem value="meta_leads">Meta / Facebook</SelectItem>
                  <SelectItem value="wasi">Wasi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Operación</Label>
              <Select value={filters.tipo_operacion} onValueChange={(v) => set('tipo_operacion', v ?? 'all')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="ambas">Ambas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Etiqueta</Label>
              <Select value={filters.tag} onValueChange={(v) => set('tag', v ?? 'all')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Cualquiera" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cualquier etiqueta</SelectItem>
                  {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Agente</Label>
              <Input value={filters.agente} onChange={(e) => set('agente', e.target.value)} className="h-8 text-sm" placeholder="Nombre" />
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Ciudad</Label>
              <Input value={filters.ciudad} onChange={(e) => set('ciudad', e.target.value)} className="h-8 text-sm" />
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Zona de interés</Label>
              <Input value={filters.zona} onChange={(e) => set('zona', e.target.value)} className="h-8 text-sm" />
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Presup. mín.</Label>
              <Input value={filters.presupuestoMin} onChange={(e) => set('presupuestoMin', e.target.value)} className="h-8 text-sm" type="number" placeholder="USD" />
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Presup. máx.</Label>
              <Input value={filters.presupuestoMax} onChange={(e) => set('presupuestoMax', e.target.value)} className="h-8 text-sm" type="number" placeholder="USD" />
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Seguimiento desde</Label>
              <Input value={filters.followupAfter} onChange={(e) => set('followupAfter', e.target.value)} className="h-8 text-sm" type="date" />
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Seguimiento hasta</Label>
              <Input value={filters.followupBefore} onChange={(e) => set('followupBefore', e.target.value)} className="h-8 text-sm" type="date" />
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Registrado desde</Label>
              <Input value={filters.createdAfter} onChange={(e) => set('createdAfter', e.target.value)} className="h-8 text-sm" type="date" />
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Registrado hasta</Label>
              <Input value={filters.createdBefore} onChange={(e) => set('createdBefore', e.target.value)} className="h-8 text-sm" type="date" />
            </div>

            <label className="col-span-2 flex items-center gap-2 mt-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.onlyDueFollowups}
                onChange={(e) => set('onlyDueFollowups', e.target.checked)}
                className="rounded border-border"
              />
              Solo contactos con seguimiento vencido o de hoy
            </label>
          </div>

          <div className="flex justify-between items-center pt-3 mt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onChange(EMPTY_FILTERS)}
              disabled={!hasAnyFilter}
            >
              Limpiar todo
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {activeAdvancedCount} filtro{activeAdvancedCount === 1 ? '' : 's'} activo{activeAdvancedCount === 1 ? '' : 's'}
            </span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-xs text-muted-foreground"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          <X className="h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  )
}

/**
 * Apply all filter rules to a list of contacts. Centralised so both the
 * table view and the kanban view stay in sync.
 */
export function applyFilters<T extends {
  nombre: string
  email: string | null
  telefono: string | null
  tipo: string
  etapa_crm: string
  fuente: string
  tipo_operacion: string
  agente_nombre: string | null
  tags: string[]
  ciudad: string | null
  zona_interes: string | null
  presupuesto_min: number | null
  presupuesto_max: number | null
  fecha_seguimiento: string | null
  created_at: string
}>(contacts: T[], f: ContactFilters): T[] {
  const today = new Date().toISOString().slice(0, 10)
  const q = f.search.trim().toLowerCase()

  return contacts.filter((c) => {
    if (q) {
      const hit =
        c.nombre.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.telefono ?? '').toLowerCase().includes(q)
      if (!hit) return false
    }
    if (f.tipo !== 'all' && c.tipo !== f.tipo) return false
    if (f.stage !== 'all' && c.etapa_crm !== f.stage) return false
    if (f.fuente !== 'all' && c.fuente !== f.fuente) return false
    if (f.tipo_operacion !== 'all' && c.tipo_operacion !== f.tipo_operacion) return false
    if (f.tag !== 'all' && !(c.tags ?? []).includes(f.tag)) return false
    if (f.agente && !(c.agente_nombre ?? '').toLowerCase().includes(f.agente.toLowerCase())) return false
    if (f.ciudad && !(c.ciudad ?? '').toLowerCase().includes(f.ciudad.toLowerCase())) return false
    if (f.zona   && !(c.zona_interes ?? '').toLowerCase().includes(f.zona.toLowerCase())) return false

    if (f.presupuestoMin) {
      const v = parseFloat(f.presupuestoMin)
      if (Number.isFinite(v) && (c.presupuesto_max ?? c.presupuesto_min ?? 0) < v) return false
    }
    if (f.presupuestoMax) {
      const v = parseFloat(f.presupuestoMax)
      if (Number.isFinite(v) && (c.presupuesto_min ?? c.presupuesto_max ?? 0) > v) return false
    }

    if (f.followupAfter && (!c.fecha_seguimiento || c.fecha_seguimiento < f.followupAfter)) return false
    if (f.followupBefore && (!c.fecha_seguimiento || c.fecha_seguimiento > f.followupBefore)) return false

    if (f.createdAfter && c.created_at.slice(0, 10) < f.createdAfter) return false
    if (f.createdBefore && c.created_at.slice(0, 10) > f.createdBefore) return false

    if (f.onlyDueFollowups) {
      if (!c.fecha_seguimiento || c.fecha_seguimiento > today) return false
    }

    return true
  })
}
