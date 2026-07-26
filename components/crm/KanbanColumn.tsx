'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
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
  const { setNodeRef, isOver } = useDroppable({ id: stage.slug, data: { stageSlug: stage.slug } })

  return (
    <div className="flex flex-col h-full min-h-0 w-[85vw] sm:w-72 shrink-0 snap-start">
      {/* Column header — pinned; only the cards below it scroll. */}
      <div className="flex items-center gap-2 mb-3 px-1 shrink-0">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
          aria-hidden="true"
        />
        <h3 className="text-sm font-semibold text-foreground truncate flex-1">{stage.nombre}</h3>
        <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-5 shrink-0">
          {contacts.length}
        </Badge>
      </div>

      {/* Cards — the column itself is the drop target, so a card can be dropped
          anywhere in the lane, including the empty area below the last card. */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto rounded-lg p-1 transition-colors ${
          isOver ? 'bg-blue-500/10 ring-2 ring-blue-500/40 ring-inset' : ''
        }`}
      >
        <SortableContext items={contacts.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {contacts.length === 0 ? (
            <div className="flex-1 min-h-[120px] rounded-lg border border-dashed border-border flex items-center justify-center py-8">
              <p className="text-xs text-muted-foreground text-center px-4">
                {isOver ? 'Soltar aquí' : `Arrastra un contacto para marcarlo como “${stage.nombre}”`}
              </p>
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
        </SortableContext>
      </div>
    </div>
  )
}
