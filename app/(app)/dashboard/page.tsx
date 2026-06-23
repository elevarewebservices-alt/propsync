import { StatsCards } from '@/components/dashboard/StatsCards'
import { RecentProperties } from '@/components/dashboard/RecentProperties'
import { WhatsAppStatsCard } from '@/components/dashboard/WhatsAppStatsCard'
import { getDashboardData } from '@/lib/dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let data
  try {
    data = await getDashboardData()
  } catch {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Estamos terminando de configurar tu cuenta. Si ves este mensaje por más de un minuto,
          cierra sesión y vuelve a iniciar sesión.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vista general de tu inventario y actividad reciente
        </p>
      </div>
      <StatsCards data={data} />
      {data.whatsapp.enviadosMes > 0 && <WhatsAppStatsCard data={data.whatsapp} />}
      <RecentProperties properties={data.recentProperties} />
    </div>
  )
}
