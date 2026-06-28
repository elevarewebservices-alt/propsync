'use client'

import { useState } from 'react'
import { Calculator, Info } from 'lucide-react'

// Approximate per-message reference rates (USD). WhatsApp pricing changes and
// varies by country + category, so these are only starting points — the rate
// field stays editable. Sources: Meta WhatsApp Business pricing.
const PRESETS: { id: string; label: string; rate: number }[] = [
  { id: 'marketing', label: 'Marketing (promociones)', rate: 0.06 },
  { id: 'utility',   label: 'Utility (seguimiento, recordatorios)', rate: 0.03 },
  { id: 'service',   label: 'Servicio (respuestas en 24h)', rate: 0.00 },
]

export function MetaCostCalculator() {
  const [messages, setMessages] = useState(500)
  const [rate, setRate] = useState(PRESETS[0].rate)
  const [presetId, setPresetId] = useState(PRESETS[0].id)

  const monthly = Math.max(0, messages) * Math.max(0, rate)

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Calculadora de costos de WhatsApp (Meta)</h3>
          <p className="text-xs text-muted-foreground">Estima cuánto te cobrará Meta por tus mensajes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Tipo de mensaje</label>
          <select
            value={presetId}
            onChange={(e) => {
              const p = PRESETS.find((x) => x.id === e.target.value)!
              setPresetId(p.id)
              setRate(p.rate)
            }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Mensajes por mes</label>
          <input
            type="number"
            min={0}
            value={messages}
            onChange={(e) => setMessages(Number(e.target.value))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Costo aprox. por mensaje (USD)</label>
          <input
            type="number"
            min={0}
            step={0.001}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-end justify-between rounded-lg bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Costo estimado mensual de Meta</p>
          <p className="text-[11px] text-muted-foreground">Se cobra directo a tu cuenta de WhatsApp Business</p>
        </div>
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
          ${monthly.toFixed(2)}
        </p>
      </div>

      <div className="flex gap-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3">
        <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">¿Por qué este costo es aparte?</strong> WhatsApp Business cobra
            por mensaje según el país y la categoría. Ese cobro lo hace <strong>Meta directamente</strong> a tu
            cuenta de WhatsApp Business — no pasa por PropSync.
          </p>
          <p>
            El add-on de PropSync (+$40/mes) cubre la <strong>plataforma y la automatización</strong>
            (plantillas, campañas, inbox, calificación de leads). Los mensajes los pagas tú a Meta, así
            controlas el volumen y no pagas sobreprecio de intermediarios.
          </p>
          <p className="text-[11px]">
            Los valores de arriba son aproximados; el precio exacto depende de tu país y categoría
            (consulta la tarifa oficial de Meta).
          </p>
        </div>
      </div>
    </div>
  )
}
