'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Contact, CrmStage } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table'
import { Mail, Phone, Calendar, Zap, ChevronDown, ChevronUp } from 'lucide-react'

type SortKey = 'nombre' | 'created_at' | 'fecha_seguimiento' | 'etapa_crm' | 'tipo'

interface Props {
  contacts: Contact[]
  stages: CrmStage[]
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/** Deterministic pastel avatar — same name → same color. */
function avatarBg(name: string): string {
  const palette = [
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200',
    'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-200',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return palette[hash % palette.length]
}

function tipoBadge(tipo: string) {
  const map: Record<string, string> = {
    cliente:     'bg-blue-50  text-blue-700  border-blue-200  dark:bg-blue-950/40  dark:text-blue-300  dark:border-blue-900/60',
    propietario: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60',
    broker:      'bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-950/40  dark:text-amber-300  dark:border-amber-900/60',
  }
  return map[tipo] ?? 'bg-muted text-muted-foreground border-border'
}

function followupTone(date: string | null): string {
  if (!date) return 'text-muted-foreground'
  const today = new Date().toISOString().slice(0, 10)
  if (date < today)  return 'text-red-600 font-medium dark:text-red-400'
  if (date === today) return 'text-amber-600 font-medium dark:text-amber-400'
  return 'text-foreground'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ContactsTable({ contacts, stages }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const stageBySlug = Object.fromEntries(stages.map((s) => [s.slug, s]))

  const sorted = [...contacts].sort((a, b) => {
    const av = (a[sortKey] ?? '') as string
    const bv = (b[sortKey] ?? '') as string
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortHead = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {label}
        {sortKey === k ? (
          sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : null}
      </button>
    </TableHead>
  )

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No hay contactos que coincidan</p>
        <p className="text-xs text-muted-foreground mt-1">Ajusta los filtros o agrega un nuevo contacto.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <SortHead k="nombre"            label="Contacto" />
              <SortHead k="tipo"              label="Tipo" />
              <SortHead k="etapa_crm"         label="Etapa" />
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fuente</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agente</TableHead>
              <SortHead k="fecha_seguimiento" label="Seguimiento" />
              <SortHead k="created_at"        label="Registrado" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => {
              const stage = stageBySlug[c.etapa_crm]
              return (
                <TableRow key={c.id} className="cursor-pointer group">
                  <TableCell className="py-3">
                    <Link href={`/crm/${c.id}`} className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarBg(c.nombre)}`}>
                        {initials(c.nombre)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{c.nombre}</div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                          {c.email && (
                            <span className="flex items-center gap-1 truncate max-w-[160px]">
                              <Mail className="h-3 w-3" /> {c.email}
                            </span>
                          )}
                          {c.telefono && (
                            <span className="flex items-center gap-1 truncate">
                              <Phone className="h-3 w-3" /> {c.telefono}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] capitalize border ${tipoBadge(c.tipo)}`}>
                      {c.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {stage ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
                        style={{ borderColor: stage.color + '50', color: stage.color, backgroundColor: stage.color + '12' }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.nombre}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{c.etapa_crm}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.fuente === 'meta_leads' ? (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-[11px] gap-1 dark:bg-blue-900/40 dark:text-blue-300">
                        <Zap className="h-3 w-3" /> Meta
                      </Badge>
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
                        <Calendar className="h-3 w-3" />
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
  )
}
