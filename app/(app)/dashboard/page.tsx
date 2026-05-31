import { StatsCards } from '@/components/dashboard/StatsCards'
import { RecentProperties } from '@/components/dashboard/RecentProperties'
import { WhatsAppStatsCard } from '@/components/dashboard/WhatsAppStatsCard'
import { getDashboardData } from '@/lib/dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const data = await getDashboardData()

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
