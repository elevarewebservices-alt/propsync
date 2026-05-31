'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { WhatsAppResponse } from '@/lib/types'
import { Loader2 } from 'lucide-react'

const respuestaConfig: Record<WhatsAppResponse, { label: string; className: string }> = {
  disponible: { label: 'Disponible', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  vendida: { label: 'Vendida', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  no_disponible: { label: 'No disponible', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  sin_respuesta: { label: 'Sin respuesta', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

interface ResponseItem {
  id: string
  propertyId: string | null
  propertyTitulo: string
  propietario: string
  telefono: string
  respuesta: WhatsAppResponse
  mensaje: string | null
  fecha: string
  accionTomada: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

interface ResponsesTableProps {
  filter?: WhatsAppResponse | 'todas'
}

export function ResponsesTable({ filter = 'todas' }: ResponsesTableProps) {
  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadResponses = async () => {
      try {
        const res = await fetch('/api/whatsapp/responses')
        if (res.ok) {
          const data = await res.json()
          setResponses(data.responses ?? [])
        }
      } catch (err) {
        console.error('Error loading responses:', err)
      } finally {
        setLoading(false)
      }
    }
    loadResponses()
  }, [])

  const filtered = filter === 'todas'
    ? responses
    : responses.filter((r) => r.respuesta === filter)

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center">
        <p className="text-sm text-muted-foreground">No hay respuestas en esta categoría.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left bg-muted/40">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Propietario</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Propiedad</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Respuesta</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Mensaje</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((resp) => {
              const config = respuestaConfig[resp.respuesta]
              return (
                <tr key={resp.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{resp.propietario}</p>
                    <p className="text-xs text-muted-foreground">{resp.telefono}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground line-clamp-1 max-w-[180px]">
                      {resp.propertyTitulo}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={`text-xs ${config.className}`}>
                      {config.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">
                      {resp.mensaje ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(resp.fecha)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
