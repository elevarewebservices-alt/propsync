import { Badge } from '@/components/ui/badge'
import { PlanId } from '@/lib/types'
import { getPlan } from '@/lib/plans'

interface PlanBadgeProps {
  planId: PlanId
}

const planStyles: Record<PlanId, string> = {
  starter: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  pro: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  agency: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
}

export function PlanBadge({ planId }: PlanBadgeProps) {
  const plan = getPlan(planId)
  return (
    <Badge variant="outline" className={`font-semibold text-xs ${planStyles[planId]}`}>
      {plan.nombre}
    </Badge>
  )
}
