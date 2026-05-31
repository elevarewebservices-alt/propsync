'use client'

import Link from 'next/link'
import { WhatsAppCampaignCard } from '@/components/mantener/WhatsAppCampaignCard'
import { MessageCircle, ListChecks, Settings2, ArrowRight, Zap } from 'lucide-react'

export default function MantenerPage() {
  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mantener inventario</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Contacto automático con propietarios vía WhatsApp para mantener el inventario actualizado
        </p>
      </div>

      {/* Main campaign card */}
      <WhatsAppCampaignCard />

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Link
          href="/mantener/campana-whatsapp"
          className="group rounded-xl border border-border bg-card p-5 hover:border-blue-500 transition-colors"
        >
          <div className="inline-flex rounded-lg p-2.5 mb-4 bg-blue-50 dark:bg-blue-950/30">
            <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            Gestión de campañas
            <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Inicia, detiene y monitorea campañas de verificación WhatsApp con los propietarios.
          </p>
        </Link>

        <Link
          href="/mantener/respuestas"
          className="group rounded-xl border border-border bg-card p-5 hover:border-purple-500 transition-colors"
        >
          <div className="inline-flex rounded-lg p-2.5 mb-4 bg-purple-50 dark:bg-purple-950/30">
            <ListChecks className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            Respuestas recibidas
            <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Revisa las respuestas de los propietarios y acciones tomadas automáticamente.
          </p>
        </Link>

        <Link
          href="/configuracion/whatsapp"
          className="group rounded-xl border border-border bg-card p-5 hover:border-green-500 transition-colors"
        >
          <div className="inline-flex rounded-lg p-2.5 mb-4 bg-green-50 dark:bg-green-950/30">
            <Settings2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            Configurar WhatsApp
            <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Conecta tu cuenta de WhatsApp Business con Meta Cloud API para activar las campañas.
          </p>
        </Link>

        <Link
          href="/mantener/automatizaciones"
          className="group rounded-xl border border-border bg-card p-5 hover:border-amber-500 transition-colors"
        >
          <div className="inline-flex rounded-lg p-2.5 mb-4 bg-amber-50 dark:bg-amber-950/30">
            <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            Automatizaciones
            <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Acciones automáticas por triggers: nuevo lead, sin respuesta, follow-up vencido.
          </p>
        </Link>
      </div>
    </div>
  )
}
