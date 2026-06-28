'use client'

import Link from 'next/link'
import { Lock, ArrowRight, Check } from 'lucide-react'
import { MetaCostCalculator } from '@/components/shared/MetaCostCalculator'

// Shown in place of the Mantener module for companies that don't have the
// Marketing add-on. Explains the add-on, lists what it unlocks, and surfaces
// the Meta cost calculator so they understand the WhatsApp fees are separate.
export function MantenerUpsell() {
  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex flex-col items-center text-center gap-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
          <Lock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-foreground">Mantener inventario — Add-on Marketing</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            El contacto automático con propietarios por WhatsApp para mantener tu inventario siempre activo
            es parte del add-on <strong>Marketing</strong> (+$40/mes sobre el plan Pro). Incluye nuestra
            instalación de la conexión con Meta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left w-full max-w-xl">
          {[
            'Campañas de WhatsApp a propietarios',
            'Verificación automática de disponibilidad',
            'Gestión de plantillas aprobadas por Meta',
            'Calificación automática de leads',
            'Inbox compartido de WhatsApp',
            'Email marketing masivo',
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              {f}
            </div>
          ))}
        </div>

        <Link
          href="/configuracion/planes"
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Contratar add-on Marketing <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-muted-foreground">
          La activación la hacemos nosotros — escríbenos para coordinar la instalación de tu WhatsApp.
        </p>
      </div>

      {/* Why WhatsApp costs are separate, with the calculator */}
      <MetaCostCalculator />
    </div>
  )
}
