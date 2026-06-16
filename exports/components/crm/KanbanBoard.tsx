'use client'

import { Contact, CrmStage } from '@/lib/types'
import { KanbanColumn } from './KanbanColumn'

interface Props {
  stages: CrmStage[]
  contacts: Contact[]
  onContactUpdate: (id: string, patch: Partial<Contact>) => void
  onOpenContact: (contact: Contact) => void
}

export function KanbanBoard({ stages, contacts, onContactUpdate, onOpenContact }: Props) {
  function handleMoveCard(contactId: string, toSlug: string) {
    onContactUpdate(contactId, { etapa_crm: toSlug })
    // optimistic update already applied in parent; also persist to API
    fetch(`/api/crm/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa_crm: toSlug }),
    }).catch(() => {})
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1">
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
  )
}
