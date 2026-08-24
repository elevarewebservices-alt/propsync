import { Shimmer, SkeletonScreen } from './Shimmer'

/**
 * Generic row-list placeholder — the default for any app route that doesn't
 * ship a shape-specific skeleton (CRM lists, settings, team, reports).
 */
export function ListSkeleton({
  rows = 8,
  label = 'Cargando…',
}: {
  rows?: number
  label?: string
}) {
  return (
    <SkeletonScreen label={label} className="space-y-4">
      <div className="space-y-2">
        <Shimmer className="h-6 w-48" />
        <Shimmer className="h-3 w-64" />
      </div>

      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Shimmer className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-4 w-2/5" />
              <Shimmer className="h-3 w-3/5" />
            </div>
            <Shimmer className="hidden h-5 w-20 shrink-0 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  )
}
