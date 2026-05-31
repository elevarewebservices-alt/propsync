import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, MessageSquare, CheckCircle2, ArrowRight } from 'lucide-react'
import type { DashboardData } from '@/lib/dashboard'

export function WhatsAppStatsCard({ data }: { data: DashboardData['whatsapp'] }) {
  const responseRate = data.enviadosMes > 0
    ? Math.round((data.respondidosMes / data.enviadosMes) * 100)
    : 0

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-gradient-to-r from-green-50/40 to-emerald-50/40 dark:from-green-950/20 dark:to-emerald-950/20 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
              <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">WhatsApp Business</h2>
              <p className="text-xs text-muted-foreground">Actividad del mes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.campanaActiva && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                Campaña activa
              </Badge>
            )}
            <Link
              href="/mantener"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Ver más
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
        {[
          { label: 'Mensajes enviados', value: data.enviadosMes, icon: Send, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Respuestas recibidas', value: data.respondidosMes, icon: MessageSquare, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Propiedades verificadas', value: data.propiedadesVerificadas, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
          { label: 'Tasa de respuesta', value: `${responseRate}%`, icon: MessageCircle, color: 'text-amber-600 dark:text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 flex flex-col gap-1">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
