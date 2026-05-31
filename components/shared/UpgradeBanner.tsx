import Link from 'next/link'
import { Lock, ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UpgradeBannerProps {
  requiredPlan?: string
  feature: string
  description: string
  compact?: boolean
}

export function UpgradeBanner({
  requiredPlan = 'Pro',
  feature,
  description,
  compact = false,
}: UpgradeBannerProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
        <Lock className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <span className="font-semibold">{feature}</span> requiere plan {requiredPlan}.
        </p>
        <Link href="/configuracion/planes" className={cn(buttonVariants({ size: "sm" }), "ml-auto shrink-0 bg-blue-600 hover:bg-blue-700 text-white")}>
          Upgrade
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-12 text-center dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
        <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{feature}</h2>
        <p className="max-w-md text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 dark:bg-blue-900/30">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Disponible en plan <strong>{requiredPlan}</strong> y superiores
        </span>
      </div>
      <Link href="/configuracion/planes" className={cn(buttonVariants({ size: "lg" }), "bg-blue-600 hover:bg-blue-700 text-white")}>
        Ver planes <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </div>
  )
}
