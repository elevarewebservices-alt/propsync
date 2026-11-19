'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Contact, CrmStage } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Phone, Mail, CalendarDays, Zap, MoreVertical } from 'lucide-react'
import { avatarBg, initials, tagColor, tipoBadge } from '@/lib/crm-colors'

interface Props {
  contact: Contact
  stages: CrmStage[]
  onMove: (toSlug: string) => void
  onOpen: () => void
  /** Rendered inside the DragOverlay — no drag wiring, no interactive children. */
  overlay?: boolean
}

export function KanbanCard({ contact, stages, onMove, onOpen, overlay = false }: Props) {
  const sortable = useSortable({ id: contact.id, data: { contact } })
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = sortable

  const today = new Date().toISOString().split('T')[0]
  const isPastDue = !!contact.fecha_seguimiento && contact.fecha_seguimiento < today
  const isDueToday = contact.fecha_seguimiento === today
  const otherStages = stages.filter((s) => s.slug !== contact.etapa_crm)

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={
        overlay
          ? undefined
          : { transform: CSS.Transform.toString(transform), transition }
      }
      className={`bg-card border border-border rounded-lg p-3 transition-shadow ${
        overlay ? 'shadow-lg rotate-1 cursor-grabbing' : 'hover:border-blue-400 hover:shadow-sm'
      } ${isDragging && !overlay ? 'opacity-40' : ''}`}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
    >
      {/* Header — the whole title block opens the contact; a button, so it is
          reachable by keyboard and announced properly. Drag lives on the card. */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={onOpen}
          disabled={overlay}
          className="flex items-center gap-2 flex-1 min-w-0 text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${avatarBg(contact.nombre)}`}
            aria-hidden="true"
          >
            {initials(contact.nombre)}
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-sm text-foreground truncate">{contact.nombre}</span>
            {contact.agente_nombre && (
              <span className="block text-[11px] text-muted-foreground truncate">{contact.agente_nombre}</span>
            )}
          </span>
        </button>

        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 capitalize border ${tipoBadge(contact.tipo)}`}>
          {contact.tipo}
        </Badge>
      </div>

      {/* Contact info */}
      <div className="space-y-1 mb-2">
        {contact.telefono && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{contact.telefono}</span>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
      </div>

      {contact.fuente === 'encuentra24' && (
        <div className="mb-2">
          <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Encuentra24</span>
        </div>
      )}
      {contact.fuente === 'meta_leads' && (
        <div className="flex items-center gap-1 mb-2">
          <Zap className="h-3 w-3 text-blue-500" aria-hidden="true" />
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Meta</span>
          {contact.meta_campaign && (
            <span className="text-[10px] text-muted-foreground truncate">· {contact.meta_campaign}</span>
          )}
        </div>
      )}

      {contact.tags && contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {contact.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${tagColor(tag)}`}>
              {tag}
            </span>
          ))}
          {contact.tags.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              +{contact.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {contact.fecha_seguimiento && (
        <div
          className={`flex items-center gap-1 text-[11px] ${
            isPastDue
              ? 'text-red-600 dark:text-red-400 font-medium'
              : isDueToday
              ? 'text-amber-700 dark:text-amber-400 font-medium'
              : 'text-muted-foreground'
          }`}
        >
          <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>
            {isPastDue ? 'Vencido · ' : isDueToday ? 'Hoy · ' : ''}
            {new Date(contact.fecha_seguimiento + 'T12:00:00').toLocaleDateString('es', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      )}

      {/* Move menu — always visible (it used to be opacity-0 until hover, which
          made it unreachable on touch, the primary surface) and the accessible
          path for anyone not using a pointer. 44px target on touch. */}
      {!overlay && otherStages.length > 0 && (
        <div
          className="mt-2 pt-2 border-t border-border flex justify-end"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Mover a ${contact.nombre} a otra etapa`}
              className="inline-flex items-center justify-center gap-1 h-11 w-11 md:h-8 md:w-auto md:px-2 -my-1 rounded-md text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="hidden md:inline">Mover</span>
              <MoreVertical className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                Mover a etapa
              </DropdownMenuLabel>
              {otherStages.map((s) => (
                <DropdownMenuItem key={s.slug} onClick={() => onMove(s.slug)} className="text-xs">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: s.color }}
                    aria-hidden="true"
                  />
                  {s.nombre}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
