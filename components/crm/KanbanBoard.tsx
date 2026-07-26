'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Contact, CrmStage } from '@/lib/types'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { AlertTriangle } from 'lucide-react'

interface Props {
  stages: CrmStage[]
  contacts: Contact[]
  onContactUpdate: (id: string, patch: Partial<Contact>) => void
  onOpenContact: (contact: Contact) => void
}

export function KanbanBoard({ stages, contacts, onContactUpdate, onOpenContact }: Props) {
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [error, setError] = useState<string | null>(null)

  // A small movement threshold lets taps and clicks through untouched; the touch
  // delay keeps vertical scrolling working on a phone, where a drag that armed
  // instantly would hijack every scroll gesture.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  async function persistMove(contact: Contact, toSlug: string) {
    const fromSlug = contact.etapa_crm
    onContactUpdate(contact.id, { etapa_crm: toSlug })   // optimistic
    setError(null)
    try {
      const res = await fetch(`/api/crm/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa_crm: toSlug }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      // The move used to fail silently: the card stayed in the new column while
      // the database kept the old stage, so the board lied until a reload.
      onContactUpdate(contact.id, { etapa_crm: fromSlug })
      setError(`No se pudo mover a ${contact.nombre}. Revisa tu conexión e inténtalo de nuevo.`)
    }
  }

  function handleMoveCard(contactId: string, toSlug: string) {
    const contact = contacts.find((c) => c.id === contactId)
    if (contact) persistMove(contact, toSlug)
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveContact((e.active.data.current?.contact as Contact) ?? null)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveContact(null)
    const { active, over } = e
    if (!over) return

    const contact = active.data.current?.contact as Contact | undefined
    if (!contact) return

    // Dropped on a lane, or on a card already sitting in the target lane.
    const toSlug =
      (over.data.current?.stageSlug as string | undefined) ??
      (over.data.current?.contact as Contact | undefined)?.etapa_crm

    if (!toSlug || toSlug === contact.etapa_crm) return
    persistMove(contact, toSlug)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {error && (
        <div
          role="alert"
          className="mb-3 shrink-0 flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-md px-3 py-2"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="underline shrink-0 hover:no-underline"
          >
            Cerrar
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveContact(null)}
      >
        {/* Lanes scroll sideways; each lane scrolls its own cards. The board
            itself is height-locked (flex-1 min-h-0), so the page never scrolls
            vertically in kanban view. */}
        <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto overflow-y-hidden px-1 snap-x snap-mandatory sm:snap-none">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              contacts={contacts.filter((c) => c.etapa_crm === stage.slug)}
              stages={stages}
              onMoveCard={handleMoveCard}
              onOpenContact={onOpenContact}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeContact && (
            <KanbanCard
              contact={activeContact}
              stages={stages}
              onMove={() => {}}
              onOpen={() => {}}
              overlay
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
