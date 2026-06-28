import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Users, CalendarDays, TrendingUp } from 'lucide-react'
import type { DashboardData } from '@/lib/dashboard'

export function StatsCards({ data }: { data: DashboardData }) {
  const items = [
    {
      title: 'Propiedades en inventario',
      value: data.totalPropiedades,
      description: `${data.propiedadesActivas} publicadas actualmente`,
      icon: Home,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Nuevos leads (7 días)',
      value: data.nuevosLeads,
      description: 'Contactos creados esta semana',
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      title: 'Seguimientos pendientes',
      value: data.followUpsPendientes,
      description: 'Vencidos o para hoy',
      icon: CalendarDays,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Cierres este mes',
      value: data.cerradosMes,
      description: 'Leads marcados como cerrado',
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title} className="border-border overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <CardTitle className="min-w-0 text-sm font-medium leading-tight text-muted-foreground">{item.title}</CardTitle>
            <div className={`shrink-0 rounded-lg p-2 ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{item.value}</div>
            <p className="mt-1 text-xs text-muted-foreground leading-snug">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
