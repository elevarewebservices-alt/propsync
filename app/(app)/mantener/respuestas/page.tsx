'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ResponsesTable } from '@/components/mantener/ResponsesTable'
import { WhatsAppResponse } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

type FilterValue = WhatsAppResponse | 'todas'

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'disponible', label: 'Disponibles' },
  { value: 'vendida', label: 'Vendidas' },
  { value: 'no_disponible', label: 'No disponibles' },
  { value: 'sin_respuesta', label: 'Sin respuesta' },
]

export default function RespuestasPage() {
  const [filter, setFilter] = useState<FilterValue>('todas')

  return (
    <div className="p-4 md:p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/mantener"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Mantener
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">Respuestas</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Respuestas WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Mensajes recibidos de propietarios sobre la disponibilidad de sus propiedades
        </p>
      </div>

      {/* Filter tabs */}
      <div className="inline-flex h-10 items-center rounded-md border border-border bg-card p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              filter === f.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <ResponsesTable filter={filter} />
    </div>
  )
}
