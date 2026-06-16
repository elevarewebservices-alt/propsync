'use client'

import { Contact, CrmStage } from '@/lib/types'
import { KanbanCard } from './KanbanCard'
import { Badge } from '@/components/ui/badge'

interface Props {
  stage: CrmStage
  contacts: Contact[]
  stages: CrmStage[]
  onMoveCard: (contactId: string, toSlug: string) => void
  onOpenContact: (contact: Contact) => void
}

export function KanbanColumn({ stage, contacts, stages, onMoveCard, onOpenContact }: Props) {
  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <span className="text-sm font-semibold text-foreground truncate flex-1">
          {stage.nombre}
        </span>
        <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-5 shrink-0">
          {contacts.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 min-h-[200px] flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
        {contacts.length === 0 ? (
          <div className="flex-1 rounded-lg border border-dashed border-border flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground text-center px-4">Sin contactos en esta etapa</p>
          </div>
        ) : (
          contacts.map((c) => (
            <KanbanCard
              key={c.id}
              contact={c}
              stages={stages}
              onMove={(toSlug) => onMoveCard(c.id, toSlug)}
              onOpen={() => onOpenContact(c)}
            />
          ))
        )}
      </div>
    </div>
  )
}
