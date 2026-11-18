'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, X, Loader2, Check } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  editing: boolean
  saving?: boolean
  saved?:  boolean
  onEdit:   () => void
  onCancel: () => void
  onSave:   () => void
  canSave?: boolean
  /** Hide the edit toolbar (used for purely read-only sections). */
  readOnly?: boolean
  children: ReactNode
}

/**
 * A Zoho-style "section card" that switches between read & edit modes
 * with its own Edit / Save / Cancel toolbar. Keeps sections independent
 * so the user can edit only what they need without touching the rest.
 */
export function SectionCard({
  title, subtitle, editing, saving, saved, onEdit, onCancel, onSave, canSave = true, readOnly = false, children,
}: Props) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {readOnly ? (
            <span className="whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground font-medium">Solo lectura</span>
          ) : !editing ? (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onCancel} disabled={saving}>
                <X className="h-3 w-3" />
                Cancelar
              </Button>
              <Button size="sm" className="h-7 gap-1 text-xs" onClick={onSave} disabled={saving || !canSave}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3" /> : null}
                {saved ? 'Guardado' : 'Guardar'}
              </Button>
            </>
          )}
        </div>
      </header>
      <div className="px-4 py-3 sm:p-5">{children}</div>
    </section>
  )
}

/** Read-only field row used inside SectionCard's view mode. */
export function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    // Stacked (label above value) on phones; side by side from sm up. The old
    // fixed 1/3 label column let long uppercase labels ("SEGUIMIENTO") run
    // into the value on narrow screens.
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-b-0 sm:grid sm:grid-cols-[minmax(6.5rem,1fr)_2fr] sm:gap-3">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide sm:pt-0.5 break-words">{label}</div>
      <div className="min-w-0 text-sm text-foreground break-words">
        {value || <span className="text-muted-foreground/70">—</span>}
      </div>
    </div>
  )
}
