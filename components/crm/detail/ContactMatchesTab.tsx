'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Sparkles, MapPin, BedDouble, ExternalLink, TrendingUp } from 'lucide-react'
import type { Contact } from '@/lib/types'
import type { MatchResult } from '@/lib/matching'

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-7 text-right">{score}</span>
    </div>
  )
}

export function ContactMatchesTab({ contact }: { contact: Contact }) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/crm/contacts/${contact.id}/matches`)
      .then((r) => r.json())
      .then((data) => { setMatches(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [contact.id])

  const hasPrefs = contact.presupuesto_max || contact.tipo_operacion

  if (!hasPrefs) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Sin preferencias configuradas</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Completa el presupuesto y tipo de operación en la pestaña "Interés inmobiliario" para ver propiedades sugeridas.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-muted-foreground">Buscando propiedades…</div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <TrendingUp className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Sin coincidencias por ahora</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          No hay propiedades disponibles que coincidan con el presupuesto y preferencias de este contacto.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{matches.length}</span> propiedad{matches.length !== 1 ? 'es' : ''} que coincide{matches.length === 1 ? '' : 'n'} con el perfil de {contact.nombre}
        </p>
      </div>

      {matches.map(({ property, score, reasons }) => (
        <div key={property.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
          {/* Thumbnail */}
          <div className="h-16 w-16 rounded-lg bg-muted shrink-0 overflow-hidden">
            {property.main_image_url ? (
              <Image
                src={property.main_image_url}
                alt={property.titulo}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sin foto</div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground truncate">{property.titulo}</p>
              <Link href={`/propiedades`} className="shrink-0 text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mt-0.5">
              ${property.precio.toLocaleString('es')}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {property.ciudad && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {property.ciudad}{property.zona ? `, ${property.zona}` : ''}
                </span>
              )}
              {property.bedrooms && (
                <span className="inline-flex items-center gap-1">
                  <BedDouble className="h-3 w-3" />
                  {property.bedrooms} hab
                </span>
              )}
            </div>
            <div className="mt-2">
              <ScoreBar score={score} />
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {reasons.map((r) => (
                <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
