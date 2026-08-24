import { Shimmer, SkeletonScreen } from './Shimmer'

/**
 * Property-card grid placeholder. Grid classes match app/(app)/propiedades —
 * `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — so cards resolve in place.
 */
export function CardGridSkeleton({
  count = 6,
  label = 'Cargando propiedades…',
}: {
  count?: number
  label?: string
}) {
  return (
    <SkeletonScreen label={label} className="space-y-4">
      {/* filter/toolbar row */}
      <div className="flex flex-wrap gap-2">
        <Shimmer className="h-9 w-full max-w-xs" />
        <Shimmer className="h-9 w-28" />
        <Shimmer className="h-9 w-28" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
            <Shimmer className="h-40 w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Shimmer className="h-4 w-4/5" />
              <Shimmer className="h-3 w-2/5" />
              <div className="flex gap-2 pt-1">
                <Shimmer className="h-5 w-20 rounded-full" />
                <Shimmer className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  )
}
