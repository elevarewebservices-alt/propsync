'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Contact, CrmStage } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table'
import { Mail, Phone, Calendar, Zap, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'
import { avatarBg, initials, stageChipStyle, tipoBadge } from '@/lib/crm-colors'
import { Button } from '@/components/ui/button'
import { PipelineFunnelBar } from './PipelineFunnelBar'

// Dead ends, not forward progress — same exclusion the contact detail funnel uses.
const HIDDEN_FROM_FUNNEL = new Set(['descartado', 'basurero'])

type SortKey = 'nombre' | 'created_at' | 'fecha_seguimiento' | 'etapa_crm' | 'tipo'

interface Props {
  contacts: Contact[]
  stages: CrmStage[]
  /** True when the user has filters applied — changes what the empty state offers. */
  filtered?: boolean
  onClearFilters?: () => void
}

function followupTone(date: string | null): string {
  if (!date) return 'text-muted-foreground'
  const today = new Date().toISOString().slice(0, 10)
  if (date < today) return 'text-red-600 font-medium dark:text-red-400'
  if (date === today) return 'text-amber-700 font-medium dark:text-amber-400'
  return 'text-foreground'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Stage chip — colour lives in the dot and tint; the label uses the theme's
 *  foreground so it stays legible whatever hex the agency picked. */
function StageChip({ stage, slug }: { stage: CrmStage | undefined; slug: string }) {
  if (!stage) return <span className="text-xs text-muted-foreground">{slug}</span>
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border text-foreground"
      style={stageChipStyle(stage.color)}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} aria-hidden="true" />
      {stage.nombre}
    </span>
  )
}

export function ContactsTable({ contacts, stages, filtered = false, onClearFilters }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const stageBySlug = Object.fromEntries(stages.map((s) => [s.slug, s]))
  const funnelStages = stages.filter((s) => !HIDDEN_FROM_FUNNEL.has(s.slug))

  const sorted = [...contacts].sort((a, b) => {
    const av = (a[sortKey] ?? '') as string
    const bv = (b[sortKey] ?? '') as string
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortHead = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className} aria-sort={sortKey === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {label}
        {sortKey === k
          ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />)
          : null}
      </button>
    </TableHead>
  )

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <UserPlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        {filtered ? (
          <>
            <p className="text-sm font-medium">Ningún contacto coincide con estos filtros</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Prueba con menos filtros o busca por nombre, email o teléfono.
            </p>
            {onClearFilters && (
              <Button variant="outline" size="sm" className="mt-4 h-9 text-xs" onClick={onClearFilters}>
                Limpiar filtros
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Aún no hay contactos en esta etapa</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Los leads de Meta y de tu formulario web entran aquí automáticamente. También puedes
              agregar uno a mano o importar tu lista actual.
            </p>
            <div className="flex gap-2 mt-4">
              <Link href="/crm/nuevo">
                <Button size="sm" className="h-9 text-xs">Nuevo contacto</Button>
              </Link>
              <Link href="/crm/importar">
                <Button variant="outline" size="sm" className="h-9 text-xs">Importar contactos</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile: card list. A 7-column table forced sideways scrolling on a
             phone, which is the surface agents actually work from. ────────── */}
      <ul className="md:hidden flex flex-col gap-2">
        {sorted.map((c) => {
          const stage = stageBySlug[c.etapa_crm]
          return (
            <li key={c.id}>
              <Link
                href={`/crm/${c.id}`}
                className="block rounded-lg border border-border bg-card p-3 active:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarBg(c.nombre)}`}
                    aria-hidden="true"
                  >
                    {initials(c.nombre)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{c.nombre}</span>
                      <Badge variant="outline" className={`text-[10px] capitalize border shrink-0 ${tipoBadge(c.tipo)}`}>
                        {c.tipo}
                      </Badge>
                    </div>
                    {c.telefono && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                        <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{c.telefono}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <StageChip stage={stage} slug={c.etapa_crm} />
                      {c.fecha_seguimiento && (
                        <span className={`inline-flex items-center gap-1 text-[11px] ${followupTone(c.fecha_seguimiento)}`}>
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {formatDate(c.fecha_seguimiento)}
                        </span>
                      )}
                    </div>
                    {/* Where each lead sits in the funnel, right in the list —
                        otherwise you have to open every card to find out. */}
                    {funnelStages.length > 1 && (
                      <div className="mt-2">
                        <PipelineFunnelBar
                          stages={funnelStages}
                          currentSlug={c.etapa_crm}
                          onChange={() => {}}
                          mini
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* ── Desktop: full table ─────────────────────────────────────────── */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortHead k="nombre" label="Contacto" />
                <SortHead k="tipo" label="Tipo" />
                <SortHead k="etapa_crm" label="Etapa" />
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fuente</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agente</TableHead>
                <SortHead k="fecha_seguimiento" label="Seguimiento" />
                <SortHead k="created_at" label="Registrado" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => {
                const stage = stageBySlug[c.etapa_crm]
                return (
                  <TableRow key={c.id} className="cursor-pointer group">
                    <TableCell className="py-3">
                      <Link href={`/crm/${c.id}`} className="flex items-center gap-3 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                        <span
                          className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarBg(c.nombre)}`}
                          aria-hidden="true"
                        >
                          {initials(c.nombre)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-sm truncate group-hover:text-primary transition-colors">{c.nombre}</span>
                          <span className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                            {c.email && (
                              <span className="flex items-center gap-1 truncate max-w-[160px]">
                                <Mail className="h-3 w-3" aria-hidden="true" /> {c.email}
                              </span>
                            )}
                            {c.telefono && (
                              <span className="flex items-center gap-1 truncate">
                                <Phone className="h-3 w-3" aria-hidden="true" /> {c.telefono}
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] capitalize border ${tipoBadge(c.tipo)}`}>
                        {c.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StageChip stage={stage} slug={c.etapa_crm} />
                    </TableCell>
                    <TableCell>
                      {c.fuente === 'meta_leads' ? (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[11px] gap-1 dark:bg-blue-900/40 dark:text-blue-300">
                          <Zap className="h-3 w-3" aria-hidden="true" /> Meta
                        </Badge>
                      ) : c.fuente === 'encuentra24' ? (
                        <Badge className="bg-orange-100 text-orange-700 border-0 dark:bg-orange-900/40 dark:text-orange-300 text-[11px]">Encuentra24</Badge>
                      ) : (
                        <span className="text-xs capitalize text-muted-foreground">{c.fuente.replace('_', ' ')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground">{c.agente_nombre ?? <span className="text-muted-foreground">—</span>}</span>
                    </TableCell>
                    <TableCell>
                      {c.fecha_seguimiento ? (
                        <span className={`inline-flex items-center gap-1 text-xs ${followupTone(c.fecha_seguimiento)}`}>
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {formatDate(c.fecha_seguimiento)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground" title={new Date(c.created_at).toLocaleString('es')}>
                        {formatDate(c.created_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
