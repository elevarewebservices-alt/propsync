'use client'

import { CrmStage } from '@/lib/types'

interface Props {
  stages: CrmStage[]
  currentSlug: string | null
  onChange: (slug: string) => void
  /** Read-only glance version — no labels, no tap targets. For list rows. */
  mini?: boolean
}

// Horizontal thermometer: one continuous rounded track, filled left-to-right
// through the reached stages' colors (like mercury color bands), instead of
// gapped segments — reads as "one bar filling up," not a stepper.
export function PipelineFunnelBar({ stages, currentSlug, onChange, mini = false }: Props) {
  const ordered = [...stages].sort((a, b) => a.position - b.position)
  const currentIndex = ordered.findIndex((s) => s.slug === currentSlug)
  const segmentWidth = ordered.length > 0 ? 100 / ordered.length : 0
  const bulbColor = currentIndex >= 0 ? ordered[currentIndex].color : 'var(--muted)'
  const currentName = currentIndex >= 0 ? ordered[currentIndex].nombre : null

  const track = (
    <div className="relative flex-1 min-w-0 rounded-full bg-muted overflow-hidden flex" aria-hidden="true">
      {ordered.map((s, i) => {
        const reached = currentIndex >= 0 && i <= currentIndex
        const isCurrent = i === currentIndex
        return (
          <div
            key={s.slug}
            title={s.nombre}
            className="h-full transition-colors duration-300"
            style={{
              width: `${segmentWidth}%`,
              backgroundColor: reached ? s.color : 'transparent',
              boxShadow: isCurrent ? 'inset 0 0 0 2px rgba(255,255,255,0.65)' : undefined,
            }}
          />
        )
      })}
    </div>
  )

  if (mini) {
    return (
      <div className="flex items-center gap-1.5 w-full min-w-0">
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: bulbColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0 h-2">{track}</div>
        <span className="sr-only">{currentName ? `Etapa: ${currentName}` : 'Sin etapa'}</span>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center gap-2">
        <div
          className="h-4 w-4 rounded-full shrink-0 ring-2 ring-background transition-colors duration-300"
          style={{ backgroundColor: bulbColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0 h-4">{track}</div>
      </div>

      {/* Current stage, spelled out. The chip row below used to be the only
          label surface, and at 1/N of a phone's width every name truncated to
          noise ("Cierre Ini…"), so the bar told you nothing at a glance. */}
      {currentName && (
        <p className="mt-2 text-xs">
          <span className="font-semibold text-foreground">{currentName}</span>
          <span className="text-muted-foreground">
            {' '}· etapa {currentIndex + 1} de {ordered.length}
          </span>
        </p>
      )}

      {/* Tap targets. Auto-width chips that wrap, instead of N fixed 1/N columns:
          they stay readable at any stage count and never force sideways scroll. */}
      <div className="flex flex-wrap gap-1 mt-2" role="group" aria-label="Etapa del pipeline">
        {ordered.map((s, i) => {
          const reached = currentIndex >= 0 && i <= currentIndex
          const isCurrent = i === currentIndex

          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => onChange(s.slug)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`${s.nombre}${isCurrent ? ' — etapa actual' : ''}`}
              // The stage hex is author-chosen and unreliable as a text colour
              // (a mid-tone amber lands ~2.1:1 on white), so the current step is
              // marked by weight and the theme's foreground instead of the hex.
              className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isCurrent
                  ? 'font-semibold text-foreground border-foreground/25 bg-muted'
                  : reached
                  ? 'text-foreground/70 border-border hover:text-foreground hover:bg-muted/60'
                  : 'text-muted-foreground border-border hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: reached ? s.color : 'var(--border)' }}
                aria-hidden="true"
              />
              {s.nombre}
            </button>
          )
        })}
      </div>
    </div>
  )
}
