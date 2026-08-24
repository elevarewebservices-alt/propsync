import { Shimmer, SkeletonScreen } from './Shimmer'

/**
 * Mirrors app/(app)/dashboard/page.tsx: a 2-up (4-up on lg) stat grid over a
 * "recent properties" list. Grid classes are copied from StatsCards.tsx so the
 * placeholder occupies the same boxes the real content lands in — that's what
 * stops the layout jumping when data arrives.
 */
export function DashboardSkeleton() {
  return (
    <SkeletonScreen label="Cargando el panel…" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-7 w-14" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <Shimmer className="h-4 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Shimmer className="h-14 w-20 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Shimmer className="h-4 w-3/5" />
                <Shimmer className="h-3 w-2/5" />
              </div>
              <Shimmer className="h-5 w-16 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  )
}
