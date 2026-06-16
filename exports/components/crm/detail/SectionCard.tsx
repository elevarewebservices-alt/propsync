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
      <header className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {readOnly ? (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Solo lectura</span>
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
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Read-only field row used inside SectionCard's view mode. */
export function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b border-border/50 last:border-b-0">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1">{label}</div>
      <div className="col-span-2 text-sm text-foreground break-words">
        {value || <span className="text-muted-foreground/70">—</span>}
      </div>
    </div>
  )
}
