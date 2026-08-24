import { cn } from '@/lib/utils'

/**
 * A single shimmering placeholder block.
 *
 * Deliberately separate from `components/ui/skeleton.tsx` (shadcn-managed, not
 * to be hand-edited): that one only pulses opacity, which reads as "frozen" on
 * a slow connection. This one sweeps a highlight band across the block, so the
 * user can tell the app is still working rather than stuck — the whole point on
 * the native shell, where a cold load waits on the network before anything
 * paints.
 *
 * Respects prefers-reduced-motion: the sweep is dropped and the block falls
 * back to a static muted surface.
 */
export function Shimmer({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('relative overflow-hidden rounded-md bg-muted', className)}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent motion-reduce:hidden" />
    </div>
  )
}

/**
 * Wraps a whole loading screen. `role="status"` + the visually-hidden label
 * mean screen readers announce the wait instead of reading a wall of empty
 * boxes, and `aria-busy` lets tests wait on it deterministically.
 */
export function SkeletonScreen({
  label = 'Cargando…',
  className,
  children,
}: {
  label?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-busy="true" className={cn('p-4 md:p-6', className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
