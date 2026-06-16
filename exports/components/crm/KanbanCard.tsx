'use client'

import { useRouter } from 'next/navigation'
import { Contact, CrmStage } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Phone, Mail, CalendarDays, ChevronDown, Zap } from 'lucide-react'

const TIPO_COLORS: Record<string, string> = {
  cliente: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  propietario: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  broker: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

function tagColor(tag: string): string {
  const colors = [
    'bg-sky-100 text-sky-700','bg-pink-100 text-pink-700','bg-amber-100 text-amber-700',
    'bg-lime-100 text-lime-700','bg-violet-100 text-violet-700','bg-orange-100 text-orange-700',
  ]
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffff
  return colors[hash % colors.length]
}

interface Props {
  contact: Contact
  stages: CrmStage[]
  onMove: (toSlug: string) => void
  onOpen: () => void
}

export function KanbanCard({ contact, stages, onMove, onOpen }: Props) {
  const router = useRouter()
  // If parent provides an onOpen handler use it, otherwise navigate to the detail page.
  const handleClick = () => onOpen ? onOpen() : router.push(`/crm/${contact.id}`)
  const today = new Date().toISOString().split('T')[0]
  const isPastDue =
    contact.fecha_seguimiento !== null &&
    contact.fecha_seguimiento !== undefined &&
    contact.fecha_seguimiento < today
  const isDueToday = contact.fecha_seguimiento === today
  const otherStages = stages.filter((s) => s.slug !== contact.etapa_crm)

  return (
    <div
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group"
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{contact.nombre}</p>
          {contact.agente_nombre && (
            <p className="text-[11px] text-muted-foreground truncate">{contact.agente_nombre}</p>
          )}
        </div>
        <Badge className={`${TIPO_COLORS[contact.tipo] ?? ''} text-[10px] px-1.5 py-0 shrink-0 border-0`}>
          {contact.tipo}
        </Badge>
      </div>

      {/* Contact info */}
      <div className="space-y-1 mb-2">
        {contact.telefono && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{contact.telefono}</span>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
      </div>

      {/* Meta badge */}
      {contact.fuente === 'meta_leads' && (
        <div className="flex items-center gap-1 mb-2">
          <Zap className="h-3 w-3 text-blue-500" />
          <span className="text-[10px] text-blue-500 font-medium">Meta</span>
          {contact.meta_campaign && (
            <span className="text-[10px] text-muted-foreground truncate">· {contact.meta_campaign}</span>
          )}
        </div>
      )}

      {/* Tags */}
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

      {/* Follow-up date */}
      {contact.fecha_seguimiento && (
        <div
          className={`flex items-center gap-1 text-[11px] mb-2 ${
            isPastDue
              ? 'text-red-600 dark:text-red-400 font-medium'
              : isDueToday
              ? 'text-amber-600 dark:text-amber-400 font-medium'
              : 'text-muted-foreground'
          }`}
        >
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>
            {isPastDue ? '⚠ Vencido · ' : isDueToday ? 'Hoy · ' : ''}
            {new Date(contact.fecha_seguimiento + 'T12:00:00').toLocaleDateString('es', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      )}

      {/* Move stage dropdown */}
      {otherStages.length > 0 && (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <span className="flex h-6 w-full items-center justify-between px-2 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-dashed border-border rounded-md cursor-pointer hover:bg-muted">
                Mover a etapa
                <ChevronDown className="h-3 w-3 ml-1" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {otherStages.map((s) => (
                <DropdownMenuItem
                  key={s.slug}
                  onClick={() => onMove(s.slug)}
                  className="text-xs"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: s.color }}
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
