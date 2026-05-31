'use client'

import Link from 'next/link'
import { WhatsAppCampaignCard } from '@/components/mantener/WhatsAppCampaignCard'
import { ArrowLeft, Info, CheckCircle2, AlertCircle } from 'lucide-react'

export default function CampanaWhatsAppPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/mantener"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Mantener
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">Campaña WhatsApp</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Campaña de verificación</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Envía un mensaje a todos los propietarios para verificar si la propiedad sigue disponible
        </p>
      </div>

      {/* Campaign card */}
      <WhatsAppCampaignCard />

      {/* How it works */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">¿Cómo funciona?</h2>
        <div className="space-y-3">
          {[
            'Identifica todas las propiedades activas con teléfono de propietario',
            'Envía un mensaje WhatsApp utilizando el template aprobado por Meta',
            'Captura las respuestas automáticamente vía webhook',
            'Detecta el intent: disponible / vendida / no disponible',
            'Actualiza el estado de la propiedad en el inventario y guarda la nota en CRM',
          ].map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                {idx + 1}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mb-2" />
          <p className="text-xs font-medium text-foreground mb-1">Template requerido</p>
          <p className="text-xs text-muted-foreground">
            Meta requiere usar templates pre-aprobados para iniciar conversaciones.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mb-2" />
          <p className="text-xs font-medium text-foreground mb-1">Detección automática</p>
          <p className="text-xs text-muted-foreground">
            Detecta palabras clave (sí, vendida, alquilada, no) para clasificar respuestas.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mb-2" />
          <p className="text-xs font-medium text-foreground mb-1">Rate limit</p>
          <p className="text-xs text-muted-foreground">
            Meta limita a 80 mensajes por segundo. El envío se hace de forma escalonada.
          </p>
        </div>
      </div>
    </div>
  )
}
