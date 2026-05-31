'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, Sparkles, RotateCcw, Save } from 'lucide-react'

const DEFAULT_PROMPT = `Eres un redactor profesional de bienes raíces de Panamá.
Genera una descripción atractiva y profesional en español para la siguiente propiedad.
Usa 3 párrafos: el primero debe destacar lo más atractivo y la ubicación, el segundo detallar las características principales (áreas, habitaciones, amenidades), y el tercero una llamada a la acción concisa.
Máximo 200 palabras. No uses asteriscos, bullets ni markdown — solo texto corrido.`

const EXAMPLE_DESCRIPTION = `Espectacular apartamento de lujo ubicado en el corazón de Punta Pacífica, con impresionantes vistas al Océano Pacífico y al skyline de Ciudad de Panamá. A tan solo minutos de los mejores restaurantes, centros comerciales y el área bancaria, este inmueble representa una oportunidad única.

Con 3 habitaciones amplias y 2 baños completos, el apartamento cuenta con 120 m² de área total y 85 m² de área privada. Acabados de primera calidad, cocina integral equipada, aire acondicionado central y una terraza privada son solo algunas de sus características más destacadas.

Esta propiedad en venta por USD 450,000 es ideal para quien busca calidad de vida y una inversión segura en el mercado inmobiliario panameño. ¡Contáctenos hoy para agendar su visita!`

const AUTO_INCLUDED_FIELDS = [
  'Título', 'Tipo de operación (venta / alquiler)', 'Tipo de inmueble',
  'Precio y moneda', 'Habitaciones, baños y garajes',
  'Área total, construida y privada', 'Año de construcción',
  'Ciudad y zona', 'Estado del inmueble',
]

export default function DescripcionConfigPage() {
  const [template, setTemplate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/configuracion/descripcion')
      .then(r => r.json())
      .then(d => {
        setTemplate(d.template ?? '')
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/configuracion/descripcion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template }),
    })
    setSaving(false)
    if (res.ok) setSaved(true)
  }

  function handleReset() {
    setTemplate(DEFAULT_PROMPT)
    setSaved(false)
  }

  const effectiveTemplate = template.trim() || DEFAULT_PROMPT

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Descripción con IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura la plantilla de prompt que se usa para generar descripciones de propiedades automáticamente.
        </p>
      </div>

      {/* Prompt template */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Plantilla de prompt</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Este texto se envía a la IA junto con los datos de la propiedad.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={handleReset}
            disabled={loading}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </Button>
        </div>
        <Separator />

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando plantilla...
          </div>
        ) : (
          <textarea
            value={template}
            onChange={(e) => { setTemplate(e.target.value); setSaved(false) }}
            rows={8}
            placeholder={DEFAULT_PROMPT}
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
          />
        )}

        <p className="text-xs text-muted-foreground">
          Si dejas este campo vacío, se usará la plantilla predeterminada de PropSync.
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-muted-foreground">
            {template.length > 0 && `${template.length} caracteres`}
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Guardado</span>
            )}
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </section>

      {/* Auto-included fields */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Datos incluidos automáticamente</h2>
        <Separator />
        <p className="text-xs text-muted-foreground">
          La IA recibe estos datos de la propiedad además de tu plantilla. No necesitas mencionarlos en el prompt.
        </p>
        <ul className="grid grid-cols-2 gap-1.5">
          {AUTO_INCLUDED_FIELDS.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-amber-500">—</span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* Preview */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Ejemplo de resultado</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cómo podría verse una descripción generada con la plantilla actual.
          </p>
        </div>
        <Separator />
        <div className="rounded-lg bg-muted/40 border border-border p-4">
          <p className="text-xs text-muted-foreground/60 mb-2 uppercase tracking-wide font-medium">Prompt enviado a IA:</p>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {effectiveTemplate}
            {'\n\nDatos de la propiedad:\n- Título: Apto en Punta Pacífica\n- Tipo: Apartamento en venta\n- Precio: USD 450,000\n- 3 habitaciones | 2 baños | 1 garaje\n- Áreas — Total: 120 m² | Construida: 100 m² | Privada: 85 m²\n- Año de construcción: 2018\n- Ubicación: Ciudad de Panamá, Punta Pacífica\n- Condición: Nuevo'}
          </pre>
        </div>
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <p className="text-xs text-emerald-600 dark:text-emerald-400/70 mb-2 uppercase tracking-wide font-medium">Ejemplo de descripción generada:</p>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{EXAMPLE_DESCRIPTION}</p>
        </div>
      </section>
    </div>
  )
}
