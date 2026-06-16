'use client'

import { Contact, CrmStage } from '@/lib/types'
import { Calendar, UserCheck, Building2, Tag } from 'lucide-react'

interface Props {
  contact: Contact
  currentStage: CrmStage | undefined
  linkedCount: number
}

interface TimelineEvent {
  icon: typeof Calendar
  iconColor: string
  title: string
  description: string
  date: string
}

function timelineDate(iso: string): string {
  return new Date(iso).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })
}

/**
 * Activity tab — derives a high-level timeline from the contact record.
 * We don't have a dedicated audit-log table yet, so this surfaces the
 * key dates and current state. The Notas tab is the canonical immutable log.
 */
export function ContactActivityTab({ contact, currentStage, linkedCount }: Props) {
  const events: TimelineEvent[] = []

  // Registration
  events.push({
    icon: Calendar,
    iconColor: 'text-blue-500',
    title: 'Contacto registrado',
    description: contact.fuente === 'meta_leads'
      ? `Llegó desde Meta Lead Ads${contact.meta_campaign ? ` · ${contact.meta_campaign}` : ''}`
      : contact.fuente === 'web_form'
      ? 'Llegó desde el formulario web'
      : contact.fuente === 'referido'
      ? 'Llegó por referido'
      : 'Registrado manualmente',
    date: contact.created_at,
  })

  // Assignment
  if (contact.agente_nombre) {
    events.push({
      icon: UserCheck,
      iconColor: 'text-emerald-500',
      title: `Asignado a ${contact.agente_nombre}`,
      description: 'Agente responsable',
      date: contact.updated_at,
    })
  }

  // Properties linked
  if (linkedCount > 0) {
    events.push({
      icon: Building2,
      iconColor: 'text-violet-500',
      title: `${linkedCount} propiedad${linkedCount === 1 ? '' : 'es'} vinculada${linkedCount === 1 ? '' : 's'}`,
      description: 'Ver pestaña Propiedades',
      date: contact.updated_at,
    })
  }

  // Current stage
  if (currentStage) {
    events.push({
      icon: Tag,
      iconColor: 'text-amber-500',
      title: `Etapa actual: ${currentStage.nombre}`,
      description: currentStage.is_terminal ? 'Etapa final del pipeline' : 'En progreso',
      date: contact.updated_at,
    })
  }

  // Follow-up
  if (contact.fecha_seguimiento) {
    const today = new Date().toISOString().slice(0, 10)
    const fmt   = new Date(contact.fecha_seguimiento + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
    events.push({
      icon: Calendar,
      iconColor: contact.fecha_seguimiento < today ? 'text-red-500' : 'text-blue-500',
      title: contact.fecha_seguimiento < today ? `Seguimiento vencido: ${fmt}` : `Próximo seguimiento: ${fmt}`,
      description: contact.fecha_seguimiento < today ? 'Requiere atención inmediata' : 'Programado',
      date: contact.fecha_seguimiento,
    })
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <header className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold tracking-tight">Línea de tiempo</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Resumen automático del contacto</p>
        </header>
        <ol className="p-5 space-y-4">
          {events.map((e, i) => {
            const Icon = e.icon
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center ${e.iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1.5 min-h-[1rem]" />}
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{timelineDate(e.date)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
