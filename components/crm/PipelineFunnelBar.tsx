'use client'

import { CrmStage } from '@/lib/types'
import { Check } from 'lucide-react'

interface Props {
  stages: CrmStage[]
  currentSlug: string | null
  onChange: (slug: string) => void
}

export function PipelineFunnelBar({ stages, currentSlug, onChange }: Props) {
  const ordered = [...stages].sort((a, b) => a.position - b.position)
  const currentIndex = ordered.findIndex((s) => s.slug === currentSlug)

  return (
    <div className="flex items-stretch gap-1">
      {ordered.map((s, i) => {
        const reached = currentIndex >= 0 && i <= currentIndex
        const isCurrent = i === currentIndex

        return (
          <button
            key={s.slug}
            type="button"
            onClick={() => onChange(s.slug)}
            title={s.nombre}
            className="group flex-1 min-w-0"
          >
            <div
              className="h-2.5 rounded-full transition-all duration-200 group-hover:opacity-80 flex items-center justify-center"
              style={{ backgroundColor: reached ? s.color : 'var(--muted)' }}
            >
              {isCurrent && <Check className="h-2 w-2 text-white" strokeWidth={4} />}
            </div>
            <div
              className={`mt-1.5 text-[11px] text-center truncate px-0.5 transition-colors ${
                isCurrent ? 'font-semibold' : reached ? 'text-foreground/80' : 'text-muted-foreground group-hover:text-foreground'
              }`}
              style={isCurrent ? { color: s.color } : undefined}
            >
              {s.nombre}
            </div>
          </button>
        )
      })}
    </div>
  )
}
