'use client'

// Shared layout pieces for the property create/edit forms
// (propiedades/nueva and propiedades/[id]/editar), so both behave the same:
//   - FormAside      laptop (xl+) sticky side panel: live preview, completion
//                    checklist, publishing channels and the save buttons.
//   - MobileActionBar phones (<md): save buttons pinned above the bottom nav.
//   - PriceInput     numeric input that shows thousands separators (250,000)
//                    while the form state keeps the raw number string.

import { ReactNode } from 'react'
import { ImageIcon, CheckCircle2, Circle, MapPin, BedDouble, Bath, Maximize2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CANALES_PUBLICACION } from '@/lib/canales'

// ── Price input ─────────────────────────────────────────────────────────────

/** "250000.5" → "250,000.5" (display only). */
export function formatThousands(raw: string): string {
  if (!raw) return ''
  const [int, dec] = raw.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? `${grouped}.${dec}` : grouped
}

/** Typed text → raw number string: digits + a single dot, max 2 decimals. */
export function parseNumberInput(typed: string): string {
  const cleaned = typed.replace(/[^\d.]/g, '')
  const [int, ...rest] = cleaned.split('.')
  if (rest.length === 0) return int
  return `${int}.${rest.join('').slice(0, 2)}`
}

export function PriceInput({
  value, onChange, className, ...props
}: { value: string; onChange: (raw: string) => void } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'>) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={formatThousands(value)}
      onChange={(e) => onChange(parseNumberInput(e.target.value))}
      className={className}
    />
  )
}

// ── Checklist ────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string          // section element id to scroll to
  label: string
  done: boolean
  required?: boolean  // required to publish
}

export function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const focusable = el.querySelector<HTMLElement>('input, textarea, button, [role="combobox"]')
  focusable?.focus({ preventScroll: true })
}

// ── Aside (xl+) ─────────────────────────────────────────────────────────────

export interface PreviewData {
  titulo: string
  precio: string
  currency: string
  tipo: 'venta' | 'arriendo'
  zona: string
  ciudad: string
  imageUrl: string | null
  bedrooms: string
  bathrooms: string
  area: string
}

export function FormAside({
  preview, checklist, canales, onToggleCanal, actions, error,
}: {
  preview: PreviewData
  checklist: ChecklistItem[]
  canales: string[]
  onToggleCanal: (id: string) => void
  actions: ReactNode
  error?: string | null
}) {
  const done = checklist.filter((c) => c.done).length
  const pct = checklist.length ? Math.round((done / checklist.length) * 100) : 0
  const place = [preview.zona, preview.ciudad].filter(Boolean).join(', ')
  const symbol = preview.currency === 'PAB' ? 'B/.' : '$'

  return (
    <aside className="hidden xl:block sticky top-6 space-y-4">
      {/* Live preview — mirrors the inventory card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="aspect-[16/10] bg-muted flex items-center justify-center overflow-hidden">
          {preview.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="p-4 space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {preview.tipo === 'venta' ? 'En venta' : 'En alquiler'}
          </p>
          <p className={cn('text-sm font-semibold leading-snug line-clamp-2', !preview.titulo && 'text-muted-foreground/60')}>
            {preview.titulo || 'Título de la propiedad'}
          </p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {preview.precio ? `${symbol}${formatThousands(preview.precio)}` : <span className="text-muted-foreground/50">Sin precio</span>}
            {preview.precio && preview.tipo === 'arriendo' && <span className="text-xs font-normal text-muted-foreground"> /mes</span>}
          </p>
          {place && (
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{place}</p>
          )}
          {(preview.bedrooms || preview.bathrooms || preview.area) && (
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              {preview.bedrooms && <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{preview.bedrooms}</span>}
              {preview.bathrooms && <span className="inline-flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{preview.bathrooms}</span>}
              {preview.area && <span className="inline-flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{preview.area} m²</span>}
            </div>
          )}
        </div>
      </div>

      {/* Completion checklist */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Ficha completa</p>
          <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ul className="space-y-0.5">
          {checklist.map((c) => (
            <li key={c.id + c.label}>
              <button
                type="button"
                onClick={() => scrollToSection(c.id)}
                className="w-full flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted/60 transition-colors"
              >
                {c.done
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  : <Circle className={cn('h-3.5 w-3.5 shrink-0', c.required ? 'text-red-500' : 'text-muted-foreground/50')} />}
                <span className={cn(c.done ? 'text-muted-foreground' : 'text-foreground')}>{c.label}</span>
                {c.required && !c.done && <span className="ml-auto text-[10px] text-red-500">obligatorio</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Publishing channels — same state as the in-form section */}
      <div id="aside-canales" className="rounded-xl border border-border bg-card p-4 space-y-2.5">
        <p className="text-sm font-semibold">Lugares de publicación</p>
        <div className="flex flex-wrap gap-1.5">
          {CANALES_PUBLICACION.map((canal) => (
            <button
              key={canal.id}
              type="button"
              onClick={() => onToggleCanal(canal.id)}
              aria-pressed={canales.includes(canal.id)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                canales.includes(canal.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                  : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground',
              )}
            >
              {canal.nombre}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 px-3 py-2 rounded-lg">{error}</div>
      )}
      <div className="flex flex-col gap-2">{actions}</div>
    </aside>
  )
}

// ── Mobile action bar (<md) ─────────────────────────────────────────────────

/**
 * Sticks to the bottom of the scrolling <main>, just above the fixed
 * BottomNav, so saving never needs a scroll to the end of a long form.
 *
 * Sticky offsets are measured from <main>'s padding edge, and <main> already
 * reserves pb-20 (5rem) for the nav. The nav itself is ~3.6rem + the iOS
 * safe area, so the bar sits (5rem − 3.6rem − safe-area) *below* that edge.
 */
export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="md:hidden sticky z-30 -mx-4 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-2"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) - 2.25rem)' }}
    >
      {children}
    </div>
  )
}
