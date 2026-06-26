'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown } from 'lucide-react'

export interface GuideStep {
  title: string
  body: React.ReactNode
}

interface UsageGuideProps {
  title?: string
  intro?: React.ReactNode
  steps: GuideStep[]
  tips?: React.ReactNode[]
  defaultOpen?: boolean
}

/**
 * Collapsible in-app usage guide. Render it inside a feature page that is
 * already gated, so the guide is only visible to users who actually have
 * access to that feature.
 */
export function UsageGuide({ title = 'Guía de uso', intro, steps, tips, defaultOpen = false }: UsageGuideProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
          <BookOpen className="h-4 w-4" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 text-blue-700 dark:text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          {intro && <p className="text-sm text-blue-900/80 dark:text-blue-200/80">{intro}</p>}

          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <div className="text-xs text-muted-foreground">{step.body}</div>
                </div>
              </li>
            ))}
          </ol>

          {tips && tips.length > 0 && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-900/50 bg-white/60 dark:bg-blue-950/30 p-3">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1.5">Consejos</p>
              <ul className="space-y-1">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
