'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  FileCode2, Upload, AlertTriangle, CheckCircle2, ArrowRight, Loader2,
} from 'lucide-react'
import {
  IMPORTABLE_PROPERTY_FIELDS,
  REQUIRED_FIELD_KEYS,
  ParsedFeed,
  guessMapping,
  parsePrice,
  parseXmlFeed,
} from '@/lib/property-import'

type Step = 'upload' | 'map' | 'done'

interface RowResult {
  row: number
  titulo: string
  status: 'imported' | 'skipped' | 'error'
  reason?: string
}

interface ImportSummary {
  imported: number
  skipped: number
  errors: number
  limitHit: boolean
  results: RowResult[]
}

const NONE = '__none__'

export function XmlImportWizard() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [feed, setFeed] = useState<ParsedFeed | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setSummary(null)

    const parsed = parseXmlFeed(await file.text())
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }

    setFileName(file.name)
    setFeed(parsed.feed)
    setMapping(guessMapping(parsed.feed.fields))
    setStep('map')
  }

  const missingRequired = REQUIRED_FIELD_KEYS.filter((k) => !mapping[k])

  function valueFor(record: Record<string, string>, fieldKey: string): string {
    const source = mapping[fieldKey]
    return source ? (record[source] ?? '') : ''
  }

  async function handleImport() {
    if (!feed) return
    setImporting(true)
    setError(null)
    try {
      const rows = feed.records.map((record) => {
        const row: Record<string, string> = {}
        for (const field of IMPORTABLE_PROPERTY_FIELDS) {
          const v = valueFor(record, field.key)
          if (v) row[field.key] = v
        }
        return row
      })

      const res = await fetch('/api/properties/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo importar. Inténtalo de nuevo.')
        return
      }
      setSummary(data as ImportSummary)
      setStep('done')
    } catch {
      setError('No se pudo conectar con el servidor. Revisa tu conexión.')
    } finally {
      setImporting(false)
    }
  }

  // ── Step 3: result ────────────────────────────────────────────────────────
  if (step === 'done' && summary) {
    const problems = summary.results.filter((r) => r.status !== 'imported')
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-semibold">
                {summary.imported} propiedad{summary.imported === 1 ? '' : 'es'} importada
                {summary.imported === 1 ? '' : 's'}
              </p>
              <p className="text-sm text-muted-foreground">
                Quedaron como <strong>inactivas</strong> para que las revises antes de publicarlas.
              </p>
            </div>
          </div>

          {(summary.skipped > 0 || summary.errors > 0) && (
            <p className="text-sm text-muted-foreground mt-4">
              {summary.skipped} omitida{summary.skipped === 1 ? '' : 's'} · {summary.errors} con error
              {summary.errors === 1 ? '' : 'es'}
            </p>
          )}

          {summary.limitHit && (
            <div className="mt-4 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-md px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Se alcanzó el límite de propiedades de tu plan. El resto no se importó.
            </div>
          )}
        </div>

        {problems.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <p className="text-sm font-medium px-4 py-3 border-b border-border">Detalle</p>
            <ul className="divide-y divide-border max-h-72 overflow-y-auto">
              {problems.slice(0, 100).map((r) => (
                <li key={r.row} className="px-4 py-2.5 flex items-start gap-3 text-sm">
                  <span className="text-xs text-muted-foreground w-8 shrink-0 pt-0.5">#{r.row}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{r.titulo}</span>
                    <span className={`text-xs ${r.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                      {r.reason}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push('/propiedades')}>Ver propiedades</Button>
          <Button
            variant="outline"
            onClick={() => { setStep('upload'); setFeed(null); setSummary(null); setFileName('') }}
          >
            Importar otro archivo
          </Button>
        </div>
      </div>
    )
  }

  // ── Step 2: field mapping ─────────────────────────────────────────────────
  if (step === 'map' && feed) {
    const sample = feed.records[0] ?? {}
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm">
            <strong>{feed.records.length}</strong> propiedad{feed.records.length === 1 ? '' : 'es'} en{' '}
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{fileName}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Detectadas como <span className="font-mono">&lt;{feed.recordTag}&gt;</span>. Revisa el mapeo:
            adivinamos por el nombre de cada etiqueta, pero tú tienes la última palabra.
          </p>
        </div>

        {missingRequired.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Falta asignar:{' '}
            {missingRequired
              .map((k) => IMPORTABLE_PROPERTY_FIELDS.find((f) => f.key === k)?.label ?? k)
              .join(', ')}
            . Sin esos campos no se puede crear la propiedad.
          </div>
        )}

        <div className="space-y-3">
          {IMPORTABLE_PROPERTY_FIELDS.map((field) => {
            const source = mapping[field.key]
            const preview = source ? (sample[source] ?? '') : ''
            const badPrice = field.key === 'precio' && preview !== '' && parsePrice(preview) === null

            return (
              <div
                key={field.key}
                className="rounded-lg border border-border bg-card p-3 grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:items-center"
              >
                <Label className="text-sm">
                  {field.label}
                  {field.required && <span className="text-red-600 ml-0.5">*</span>}
                </Label>
                <div className="min-w-0">
                  <Select
                    value={source ?? NONE}
                    onValueChange={(v) =>
                      setMapping((m) => {
                        const next = { ...m }
                        if (!v || v === NONE) delete next[field.key]
                        else next[field.key] = v
                        return next
                      })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue placeholder="— No importar —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— No importar —</SelectItem>
                      {feed.fields.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {preview && (
                    <p className={`text-[11px] mt-1 truncate ${badPrice ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                      {badPrice ? 'No parece un precio: ' : 'Ejemplo: '}
                      {preview}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleImport} disabled={missingRequired.length > 0 || importing} className="gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {importing ? 'Importando…' : `Importar ${feed.records.length}`}
          </Button>
          <Button variant="outline" onClick={() => { setStep('upload'); setFeed(null) }} disabled={importing}>
            Cambiar archivo
          </Button>
        </div>
      </div>
    )
  }

  // ── Step 1: upload ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-border bg-card px-6 py-12 flex flex-col items-center gap-3 hover:bg-muted/40 hover:border-muted-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <FileCode2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">Selecciona tu archivo XML</span>
        <span className="text-xs text-muted-foreground text-center max-w-xs">
          Sirve cualquier feed de listados. Detectamos las propiedades y sus campos
          automáticamente, y tú confirmas el mapeo antes de importar.
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs mt-1 text-primary">
          <Upload className="h-3.5 w-3.5" /> Elegir archivo
        </span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      {error && (
        <div role="alert" className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-md px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}
