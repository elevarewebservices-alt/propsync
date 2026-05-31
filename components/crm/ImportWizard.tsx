'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, Download } from 'lucide-react'

interface ValidationError {
  row: number
  field: string
  message: string
}

interface ValidationResult {
  total: number
  valid: number
  errors: ValidationError[]
  preview: Record<string, string>[]
  rows: Record<string, string>[]
}

type Step = 'upload' | 'validate' | 'confirm' | 'done'

export function ImportWizard() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f)
    setStep('validate')

    const fd = new FormData()
    fd.append('file', f)

    const res = await fetch('/api/crm/contacts/import?action=validate', {
      method: 'POST',
      body: fd,
    })
    const data: ValidationResult = await res.json()
    setResult(data)
  }

  async function handleCommit() {
    if (!result) return
    setImporting(true)
    try {
      const res = await fetch('/api/crm/contacts/import?action=commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: result.rows }),
      })
      const data = await res.json()
      setImportResult(data)
      setStep('done')
    } finally {
      setImporting(false)
    }
  }

  function handleReset() {
    setStep('upload')
    setFile(null)
    setResult(null)
    setImportResult(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload','validate','confirm','done'] as Step[]).map((s, i) => {
          const labels = ['Subir archivo','Validar','Confirmar','Listo']
          const done = ['upload','validate','confirm','done'].indexOf(step) > i
          const active = step === s
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-8 bg-border" />}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${
                active ? 'text-blue-600' : done ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  active ? 'bg-blue-600 text-white' : done ? 'bg-green-600 text-white' : 'bg-muted'
                }`}>{i + 1}</span>
                {labels[i]}
              </div>
            </div>
          )
        })}
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          {/* Download template */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Plantilla de importación</p>
              <p className="text-xs text-muted-foreground">Descarga la plantilla, llénala y sube el archivo</p>
            </div>
            <a href="/api/crm/contacts/import-template">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Descargar plantilla
              </Button>
            </a>
          </div>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
            <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionarlo · Excel (.xlsx) o CSV</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        </div>
      )}

      {step === 'validate' && !result && (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Validando archivo…</p>
        </div>
      )}

      {step === 'validate' && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="rounded-lg border border-border p-4 flex-1 min-w-[140px] text-center">
              <p className="text-2xl font-bold text-foreground">{result.total}</p>
              <p className="text-xs text-muted-foreground">Total de filas</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 p-4 flex-1 min-w-[140px] text-center">
              <p className="text-2xl font-bold text-green-600">{result.valid}</p>
              <p className="text-xs text-green-700 dark:text-green-400">Válidas</p>
            </div>
            <div className={`rounded-lg border p-4 flex-1 min-w-[140px] text-center ${
              result.errors.length > 0 ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-border'
            }`}>
              <p className={`text-2xl font-bold ${result.errors.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {result.errors.length}
              </p>
              <p className={`text-xs ${result.errors.length > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
                Con errores
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Errores encontrados</p>
              </div>
              <div className="overflow-auto max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2">Fila</th>
                      <th className="text-left px-3 py-2">Campo</th>
                      <th className="text-left px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{e.row}</td>
                        <td className="px-3 py-2 font-mono">{e.field}</td>
                        <td className="px-3 py-2">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.valid > 0 && result.preview.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Vista previa (primeras 5 filas válidas):</p>
              <div className="rounded-lg border border-border overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2">Nombre</th>
                      <th className="text-left px-3 py-2">Tipo</th>
                      <th className="text-left px-3 py-2">Teléfono</th>
                      <th className="text-left px-3 py-2">Email</th>
                      <th className="text-left px-3 py-2">Etapa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((r, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{r.nombre}</td>
                        <td className="px-3 py-2">{r.tipo}</td>
                        <td className="px-3 py-2">{r.telefono}</td>
                        <td className="px-3 py-2">{r.email}</td>
                        <td className="px-3 py-2">{r.etapa || 'nuevo_lead'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleReset}>Subir otro archivo</Button>
            <Button
              size="sm"
              onClick={() => { setStep('confirm') }}
              disabled={result.valid === 0}
            >
              Continuar con {result.valid} filas válidas
            </Button>
          </div>
        </div>
      )}

      {step === 'confirm' && result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-6 text-center">
            <FileSpreadsheet className="h-10 w-10 text-blue-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-foreground">
              Importar {result.valid} contacto{result.valid !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Los contactos con teléfono duplicado serán omitidos automáticamente.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setStep('validate')}>Regresar</Button>
            <Button size="sm" onClick={handleCommit} disabled={importing}>
              {importing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Confirmar importación
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && importResult && (
        <div className="text-center py-12 space-y-4">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
          <div>
            <p className="text-xl font-semibold text-foreground">
              {importResult.imported} contacto{importResult.imported !== 1 ? 's' : ''} importado{importResult.imported !== 1 ? 's' : ''}
            </p>
            {importResult.skipped > 0 && (
              <p className="text-sm text-muted-foreground mt-1">{importResult.skipped} omitidos por duplicados</p>
            )}
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>Importar más</Button>
            <a href="/crm">
              <Button size="sm">Ver en CRM</Button>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
