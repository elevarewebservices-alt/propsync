'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Property } from '@/lib/types'

export interface PropertyFilterState {
  search: string
  wasiCode: string
  tipo: string
  propertyType: string
  ciudad: string
  zona: string
  disponibilidad: string
  etapaCrm: string
  precioMin: string
  precioMax: string
  areaMin: string
  areaMax: string
  bedrooms: string
  bathrooms: string
  garages: string
  yearBuilt: string
  agente: string
}

export const DEFAULT_FILTERS: PropertyFilterState = {
  search: '', wasiCode: '', tipo: '', propertyType: '', ciudad: '', zona: '',
  disponibilidad: '', etapaCrm: '', precioMin: '', precioMax: '',
  areaMin: '', areaMax: '', bedrooms: '', bathrooms: '', garages: '',
  yearBuilt: '', agente: '',
}

interface Props {
  filters: PropertyFilterState
  onChange: (f: PropertyFilterState) => void
  properties: Property[]
  agents: { id: string; nombre: string }[]
}

const ETAPA_LABELS: Record<string, string> = {
  prospecto: 'Prospecto', contactado: 'Contactado', visita: 'Visita',
  oferta: 'Oferta', negociando: 'Negociando', cerrado: 'Cerrado', nuevo_lead: 'Nuevo Lead',
}

function countActive(f: PropertyFilterState): number {
  return Object.entries(f).filter(([, v]) => v !== '').length
}

export function PropertyFilters({ filters, onChange, properties, agents }: Props) {
  const [open, setOpen] = useState(false)

  const set = (key: keyof PropertyFilterState) => (val: string | null) =>
    onChange({ ...filters, [key]: !val || val === '__all__' ? '' : val })

  const setInput = (key: keyof PropertyFilterState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value })

  const clear = () => onChange(DEFAULT_FILTERS)

  // Dynamic dropdown values extracted from loaded properties
  const ciudades = useMemo(() => {
    const vals = Array.from(new Set(properties.map(p => p.ciudad).filter(Boolean))) as string[]
    return vals.sort()
  }, [properties])

  const zonas = useMemo(() => {
    const source = filters.ciudad
      ? properties.filter(p => p.ciudad === filters.ciudad)
      : properties
    const vals = Array.from(new Set(source.map(p => p.zona).filter(Boolean))) as string[]
    return vals.sort()
  }, [properties, filters.ciudad])

  const propertyTypes = useMemo(() => {
    const vals = Array.from(new Set(properties.map(p => p.property_type_label).filter(Boolean))) as string[]
    return vals.sort()
  }, [properties])

  const activeCount = countActive(filters)

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, zona, dirección..."
            value={filters.search}
            onChange={setInput('search')}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 h-10"
          onClick={() => setOpen(o => !o)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-blue-600 text-white rounded-full">
              {activeCount}
            </Badge>
          )}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="gap-1.5 shrink-0 h-10 text-muted-foreground" onClick={clear}>
            <X className="h-3.5 w-3.5" /> Limpiar
          </Button>
        )}
      </div>

      {/* Advanced panel */}
      {open && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Búsqueda avanzada
            {activeCount > 0 && <span className="ml-2 text-blue-600 normal-case font-normal">({activeCount} filtro{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''})</span>}
          </p>

          {/* Row 1: Código Wasi + Tipo negocio + Tipo inmueble */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Código Wasi</label>
              <Input
                placeholder="Ej. 12345"
                value={filters.wasiCode}
                onChange={setInput('wasiCode')}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipo de negocio</label>
              <Select value={filters.tipo || '__all__'} onValueChange={set('tipo')}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="arriendo">Arriendo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipo de inmueble</label>
              <Select value={filters.propertyType || '__all__'} onValueChange={set('propertyType')}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {propertyTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Ciudad + Zona + Disponibilidad */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ciudad</label>
              <Select value={filters.ciudad || '__all__'} onValueChange={(v: string | null) => {
                onChange({ ...filters, ciudad: !v || v === '__all__' ? '' : v, zona: '' })
              }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {ciudades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Zona</label>
              <Select value={filters.zona || '__all__'} onValueChange={set('zona')}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {zonas.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Disponibilidad</label>
              <Select value={filters.disponibilidad || '__all__'} onValueChange={set('disponibilidad')}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                  <SelectItem value="alquilado">Alquilado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Precio */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Precio desde</label>
              <Input type="number" min="0" placeholder="0" value={filters.precioMin} onChange={setInput('precioMin')} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Precio hasta</label>
              <Input type="number" min="0" placeholder="Sin límite" value={filters.precioMax} onChange={setInput('precioMax')} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Área desde (m²)</label>
              <Input type="number" min="0" placeholder="0" value={filters.areaMin} onChange={setInput('areaMin')} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Área hasta (m²)</label>
              <Input type="number" min="0" placeholder="Sin límite" value={filters.areaMax} onChange={setInput('areaMax')} className="h-9 text-sm" />
            </div>
          </div>

          {/* Row 4: Hab / Baños / Garajes / Año */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { key: 'bedrooms', label: 'Habitaciones', opts: ['1', '2', '3', '4', '5+'] },
              { key: 'bathrooms', label: 'Baños', opts: ['1', '2', '3', '4+'] },
              { key: 'garages',  label: 'Garajes',  opts: ['0', '1', '2', '3+'] },
            ] as { key: keyof PropertyFilterState; label: string; opts: string[] }[]).map(({ key, label, opts }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Select value={filters[key] || '__all__'} onValueChange={set(key)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Año desde</label>
              <Input type="number" min="1900" max={new Date().getFullYear()} placeholder="Ej. 2010" value={filters.yearBuilt} onChange={setInput('yearBuilt')} className="h-9 text-sm" />
            </div>
          </div>

          {/* Row 5: Etapa CRM + Encargado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Etapa CRM</label>
              <Select value={filters.etapaCrm || '__all__'} onValueChange={set('etapaCrm')}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las etapas</SelectItem>
                  {Object.entries(ETAPA_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {agents.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Encargado</label>
                <Select value={filters.agente || '__all__'} onValueChange={set('agente')}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {agents.map(a => <SelectItem key={a.id} value={a.nombre}>{a.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.search && <FilterChip label={`"${filters.search}"`} onRemove={() => set('search')('')} />}
          {filters.wasiCode && <FilterChip label={`Wasi: ${filters.wasiCode}`} onRemove={() => set('wasiCode')('')} />}
          {filters.tipo && <FilterChip label={filters.tipo === 'venta' ? 'Venta' : 'Arriendo'} onRemove={() => set('tipo')('')} />}
          {filters.propertyType && <FilterChip label={filters.propertyType} onRemove={() => set('propertyType')('')} />}
          {filters.ciudad && <FilterChip label={filters.ciudad} onRemove={() => onChange({ ...filters, ciudad: '', zona: '' })} />}
          {filters.zona && <FilterChip label={filters.zona} onRemove={() => set('zona')('')} />}
          {filters.disponibilidad && <FilterChip label={filters.disponibilidad} onRemove={() => set('disponibilidad')('')} />}
          {filters.etapaCrm && <FilterChip label={ETAPA_LABELS[filters.etapaCrm] ?? filters.etapaCrm} onRemove={() => set('etapaCrm')('')} />}
          {filters.precioMin && <FilterChip label={`Desde $${Number(filters.precioMin).toLocaleString()}`} onRemove={() => set('precioMin')('')} />}
          {filters.precioMax && <FilterChip label={`Hasta $${Number(filters.precioMax).toLocaleString()}`} onRemove={() => set('precioMax')('')} />}
          {filters.areaMin && <FilterChip label={`Área ≥ ${filters.areaMin} m²`} onRemove={() => set('areaMin')('')} />}
          {filters.areaMax && <FilterChip label={`Área ≤ ${filters.areaMax} m²`} onRemove={() => set('areaMax')('')} />}
          {filters.bedrooms && <FilterChip label={`${filters.bedrooms} hab`} onRemove={() => set('bedrooms')('')} />}
          {filters.bathrooms && <FilterChip label={`${filters.bathrooms} baños`} onRemove={() => set('bathrooms')('')} />}
          {filters.garages && <FilterChip label={`${filters.garages} garajes`} onRemove={() => set('garages')('')} />}
          {filters.yearBuilt && <FilterChip label={`Desde ${filters.yearBuilt}`} onRemove={() => set('yearBuilt')('')} />}
          {filters.agente && <FilterChip label={filters.agente} onRemove={() => set('agente')('')} />}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-full px-2.5 py-0.5">
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
