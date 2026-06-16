'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MessageSquare } from 'lucide-react'
import { Contact, PropertyNote } from '@/lib/types'

interface Props {
  contact: Contact
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return new Date(dateStr).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

export function ContactNotesTab({ contact }: Props) {
  const [notes, setNotes]       = useState<PropertyNote[]>([])
  const [loading, setLoading]   = useState(true)
  const [newNote, setNewNote]   = useState('')
  const [posting, setPosting]   = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/crm/contacts/${contact.id}/notes`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setNotes(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [contact.id])

  async function addNote() {
    if (!newNote.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/crm/contacts/${contact.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: newNote, agent_nombre: 'Agente' }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes((prev) => [...prev, note])
        setNewNote('')
        setTimeout(() => feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' }), 50)
      }
    } finally { setPosting(false) }
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Notas y conversaciones</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Bitácora permanente · Las notas no se pueden editar ni borrar
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {notes.length} nota{notes.length === 1 ? '' : 's'}
          </span>
        </header>

        <div ref={feedRef} className="p-5 max-h-[28rem] overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando notas…
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin notas todavía.</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">Añade la primera nota abajo. Las notas son permanentes.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {initials(n.agent_nombre)}
                  </div>
                  <div className="flex-1 min-w-0 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{n.agent_nombre}</span>
                      <span className="text-[10px] text-muted-foreground" title={new Date(n.created_at).toLocaleString('es')}>
                        {relativeTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{n.contenido}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-4">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote() }}
            placeholder="Añadir nota… (Ctrl+Enter para guardar)"
            rows={3}
            className="resize-none text-sm"
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" disabled={!newNote.trim() || posting} onClick={addNote}>
              {posting && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              Añadir nota
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
