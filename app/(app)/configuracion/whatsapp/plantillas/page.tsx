'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { UsageGuide } from '@/components/shared/UsageGuide'
import { ArrowLeft, Loader2, AlertCircle, Plus, Trash2, Lock, ArrowRight } from 'lucide-react'

interface Template {
  id: string
  name: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'IN_APPEAL' | 'PAUSED' | 'DISABLED'
  rejected_reason?: string
}

const STATUS_STYLE: Record<Template['status'], string> = {
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  IN_APPEAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PAUSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  DISABLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<Template['category']>('UTILITY')
  const [language, setLanguage] = useState('es')
  const [header, setHeader] = useState('')
  const [body, setBody] = useState('')
  const [footer, setFooter] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/configuracion/whatsapp/templates')
      const data = await res.json()
      if (res.status === 403) {
        setLocked(true)
      } else if (!res.ok) {
        setError(data.error ?? 'Error al cargar templates')
      } else {
        setTemplates(data.templates ?? [])
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setCategory('UTILITY')
    setLanguage('es')
    setHeader('')
    setBody('')
    setFooter('')
    setFormError(null)
  }

  const handleCreate = async () => {
    setFormError(null)
    if (!/^[a-z0-9_]+$/.test(name)) {
      setFormError('El nombre solo puede tener minúsculas, números y guion bajo (_)')
      return
    }
    if (!body.trim()) {
      setFormError('El cuerpo del mensaje es requerido')
      return
    }

    setSaving(true)
    try {
      const components = [
        ...(header.trim() ? [{ type: 'HEADER' as const, format: 'TEXT' as const, text: header.trim() }] : []),
        { type: 'BODY' as const, text: body.trim() },
        ...(footer.trim() ? [{ type: 'FOOTER' as const, text: footer.trim() }] : []),
      ]

      const res = await fetch('/api/configuracion/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, language, components }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error ?? 'Error al crear el template')
        return
      }
      setOpen(false)
      resetForm()
      await load()
    } catch {
      setFormError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tplName: string) => {
    if (!confirm(`¿Eliminar el template "${tplName}"? Esto no se puede deshacer.`)) return
    try {
      await fetch(`/api/configuracion/whatsapp/templates/${encodeURIComponent(tplName)}`, { method: 'DELETE' })
      await load()
    } catch {
      // noop — load() below will reflect actual state either way
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/configuracion/whatsapp"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          WhatsApp
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">Templates</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates de WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crea y gestiona los templates aprobados por Meta para iniciar conversaciones fuera de la ventana de 24h
          </p>
        </div>
        {!locked && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
            <DialogTrigger render={<Button className="bg-green-600 hover:bg-green-700 text-white gap-1.5" />}>
              <Plus className="h-4 w-4" />
              Nuevo template
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuevo template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-name">Nombre *</Label>
                  <Input
                    id="tpl-name"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    placeholder="confirmacion_visita"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Minúsculas, números y guion bajo — sin espacios</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Categoría *</Label>
                    <Select value={category} onValueChange={(v) => setCategory((v ?? 'UTILITY') as Template['category'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTILITY">Utility</SelectItem>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Idioma *</Label>
                    <Select value={language} onValueChange={(v) => setLanguage(v ?? 'es')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es_PA">Español (Panamá)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tpl-header">Encabezado (opcional)</Label>
                  <Input id="tpl-header" value={header} onChange={(e) => setHeader(e.target.value)} placeholder="Confirmación de visita" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tpl-body">Cuerpo del mensaje *</Label>
                  <Textarea
                    id="tpl-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={'Hola {{1}}, tu visita a {{2}} está confirmada para {{3}}.'}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code>, etc. para variables que se reemplazan al enviar
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tpl-footer">Pie de página (opcional)</Label>
                  <Input id="tpl-footer" value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="PropSync" />
                </div>

                {formError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300">{formError}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar a revisión de Meta'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {locked && (
        <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-12 text-center dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Add-on Marketing</h2>
            <p className="max-w-md text-muted-foreground">
              Gestión de templates de WhatsApp, respuesta automática a leads y email marketing masivo.
              Requiere plan Pro + add-on Marketing (+$40/mes).
            </p>
          </div>
          <Link
            href="/configuracion/planes"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ver planes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Usage guide — only rendered for users who actually have access
          (locked users see the upsell screen above instead). */}
      {!locked && (
        <UsageGuide
          title="Guía de uso — Templates de WhatsApp"
          intro={
            <>
              WhatsApp solo te deja escribirle a un cliente <strong>libremente durante 24h</strong> después
              de su último mensaje. Pasada esa ventana, únicamente puedes iniciar la conversación con un
              <strong> template aprobado por Meta</strong>. Aquí los creas, los envías a revisión y ves su estado.
            </>
          }
          steps={[
            {
              title: 'Crea el template',
              body: <>Pulsa <em>Nuevo template</em>. Ponle un nombre en minúsculas con guion bajo (ej. <code>confirmacion_visita</code>), elige categoría e idioma.</>,
            },
            {
              title: 'Escribe el cuerpo con variables',
              body: <>Usa <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code>… donde quieras insertar datos al enviar (nombre del cliente, propiedad, fecha). El encabezado y el pie son opcionales.</>,
            },
            {
              title: 'Envía a revisión de Meta',
              body: <>Al guardar, el template queda en estado <strong>PENDING</strong>. Meta lo revisa (de minutos hasta ~24h) y pasa a <strong>APPROVED</strong> o <strong>REJECTED</strong>.</>,
            },
            {
              title: 'Úsalo en tus campañas',
              body: <>Solo los templates <strong>APPROVED</strong> se pueden enviar. Una vez aprobado, ya está disponible para las respuestas automáticas y campañas de WhatsApp.</>,
            },
          ]}
          tips={[
            <><strong>Utility</strong> (confirmaciones, recordatorios, seguimiento) se aprueba más fácil y rápido que <strong>Marketing</strong> (promociones).</>,
            'Evita lenguaje promocional exagerado, mayúsculas excesivas o enlaces sospechosos: son la causa #1 de rechazo.',
            'Si un template es rechazado, verás el motivo debajo de su nombre. Ajusta el texto y créalo de nuevo.',
            'Los costos por mensaje de WhatsApp los cobra Meta directamente; el add-on Marketing no los incluye.',
          ]}
        />
      )}

      {!locked && loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!locked && !loading && error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {!locked && !loading && !error && templates.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Aún no tienes templates. Crea el primero para empezar a responder leads fuera de la ventana de 24h.
        </div>
      )}

      {!locked && !loading && templates.length > 0 && (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-foreground">{t.name}</span>
                  <Badge variant="outline" className="text-xs">{t.category}</Badge>
                  <Badge className={`text-xs ${STATUS_STYLE[t.status]}`}>{t.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.language}</p>
                {t.status === 'REJECTED' && t.rejected_reason && (
                  <p className="text-xs text-red-600 dark:text-red-400">{t.rejected_reason}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(t.name)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
