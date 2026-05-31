'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { CheckCircle2, Mail, AlertCircle, Send, Trash2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'

interface SmtpState {
  host:        string
  port:        number
  secure:      boolean
  user:        string
  password:    string  // only when user is editing — never loaded from server
  fromEmail:   string
  fromName:    string
  hasPassword: boolean
  verifiedAt:  string | null
}

const EMPTY_SMTP: SmtpState = {
  host: '', port: 587, secure: false, user: '', password: '',
  fromEmail: '', fromName: '', hasPassword: false, verifiedAt: null,
}

const PRESETS = [
  { label: 'Gmail',          host: 'smtp.gmail.com',           port: 587, secure: false },
  { label: 'Outlook / 365',  host: 'smtp.office365.com',       port: 587, secure: false },
  { label: 'Zoho Mail',      host: 'smtp.zoho.com',            port: 587, secure: false },
  { label: 'Yahoo',          host: 'smtp.mail.yahoo.com',      port: 587, secure: false },
]

export default function ConfigGeneralPage() {
  const [agencia, setAgencia] = useState('')
  const [email,   setEmail]   = useState('')
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  const [smtp,        setSmtp]        = useState<SmtpState>(EMPTY_SMTP)
  const [smtpLoading, setSmtpLoading] = useState(true)
  const [smtpSaving,  setSmtpSaving]  = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpMsg,     setSmtpMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [smtpOpen,    setSmtpOpen]    = useState(false)
  const [helpOpen,    setHelpOpen]    = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setAgencia(d.agencia ?? ''); setEmail(d.email ?? '') } })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch('/api/configuracion/smtp')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setSmtp({ ...EMPTY_SMTP, ...d, password: '' })
      })
      .catch(() => {})
      .finally(() => setSmtpLoading(false))
  }, [])

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setSmtp((s) => ({ ...s, host: p.host, port: p.port, secure: p.secure }))
  }

  async function saveSmtp() {
    setSmtpSaving(true)
    setSmtpMsg(null)
    try {
      const res = await fetch('/api/configuracion/smtp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host:      smtp.host.trim(),
          port:      Number(smtp.port) || 587,
          secure:    smtp.secure,
          user:      smtp.user.trim(),
          password:  smtp.password,
          fromEmail: smtp.fromEmail.trim(),
          fromName:  smtp.fromName.trim(),
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setSmtpMsg({ type: 'err', text: body.error ?? 'Error al guardar' })
      } else {
        setSmtp((s) => ({ ...s, password: '', hasPassword: s.hasPassword || s.password.length > 0, verifiedAt: null }))
        setSmtpMsg({ type: 'ok', text: 'Guardado. Envía un correo de prueba para confirmar.' })
      }
    } catch (err) {
      setSmtpMsg({ type: 'err', text: err instanceof Error ? err.message : 'Error de red' })
    } finally {
      setSmtpSaving(false)
    }
  }

  async function testSmtp() {
    setSmtpTesting(true)
    setSmtpMsg(null)
    try {
      const res = await fetch('/api/configuracion/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendTo: email }),
      })
      const body = await res.json()
      if (!res.ok) {
        setSmtpMsg({ type: 'err', text: body.error ?? 'Error de conexión' })
      } else {
        setSmtpMsg({ type: 'ok', text: `Correo de prueba enviado a ${body.sentTo}. Revisa tu bandeja.` })
        setSmtp((s) => ({ ...s, verifiedAt: new Date().toISOString() }))
      }
    } catch (err) {
      setSmtpMsg({ type: 'err', text: err instanceof Error ? err.message : 'Error de red' })
    } finally {
      setSmtpTesting(false)
    }
  }

  async function disconnectSmtp() {
    if (!confirm('¿Desconectar el correo? Las notificaciones dejarán de enviarse desde tu correo.')) return
    setSmtpSaving(true)
    try {
      const res = await fetch('/api/configuracion/smtp', { method: 'DELETE' })
      if (res.ok) {
        setSmtp(EMPTY_SMTP)
        setSmtpMsg({ type: 'ok', text: 'Correo desconectado.' })
      }
    } finally {
      setSmtpSaving(false)
    }
  }

  const verified = Boolean(smtp.verifiedAt)
  const canTest  = smtp.host && smtp.user && (smtp.hasPassword || smtp.password.length > 0)

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración general</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Información básica de tu cuenta y agencia
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Perfil de agencia</h2>
        <Separator />

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="agencia">Nombre de agencia</Label>
            <Input
              id="agencia"
              value={agencia}
              onChange={(e) => setAgencia(e.target.value)}
              placeholder="Nombre de tu inmobiliaria"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zona-horaria">Zona horaria</Label>
            <Input id="zona-horaria" value="America/Panama (UTC-5)" readOnly className="bg-muted text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            Guardar cambios
          </Button>
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" /> Cambios guardados
            </div>
          )}
        </div>
      </div>

      {/* Email connection */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setSmtpOpen(!smtpOpen)}
          className="w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-start gap-3 text-left">
            <div className="mt-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 p-2">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Correo de notificaciones
                {verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-1.5 py-0.5 rounded">
                    <ShieldCheck className="h-3 w-3" /> Conectado
                  </span>
                )}
                {!verified && smtp.hasPassword && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                    Sin verificar
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conecta tu correo para que los recordatorios y avisos lleguen desde tu dirección.
              </p>
            </div>
          </div>
          {smtpOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {smtpOpen && (
          <div className="px-6 pb-6 space-y-5 border-t border-border">
            {/* Presets */}
            <div className="pt-5 space-y-1.5">
              <Label className="text-xs">Proveedor (opcional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="h-7 px-2.5 rounded-md border border-border text-xs hover:bg-muted transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Selecciona uno para autocompletar el servidor.</p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="smtp-host" className="text-xs">Servidor</Label>
                <Input
                  id="smtp-host" value={smtp.host}
                  onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                  placeholder="smtp.gmail.com" disabled={smtpLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-port" className="text-xs">Puerto</Label>
                <Input
                  id="smtp-port" type="number" value={smtp.port}
                  onChange={(e) => setSmtp((s) => ({ ...s, port: Number(e.target.value) || 587 }))}
                  disabled={smtpLoading}
                />
              </div>
              <div className="flex items-center justify-between gap-3 col-span-2 sm:col-span-1 pt-5">
                <Label htmlFor="smtp-secure" className="text-xs cursor-pointer">SSL/TLS (puerto 465)</Label>
                <Switch
                  id="smtp-secure" checked={smtp.secure}
                  onCheckedChange={(v) => setSmtp((s) => ({ ...s, secure: v }))}
                  disabled={smtpLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-user" className="text-xs">Usuario</Label>
                <Input
                  id="smtp-user" type="email" value={smtp.user}
                  onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))}
                  placeholder="hola@miinmobiliaria.com" disabled={smtpLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-pass" className="text-xs">
                  Contraseña {smtp.hasPassword && <span className="text-muted-foreground">(dejar vacío para no cambiar)</span>}
                </Label>
                <Input
                  id="smtp-pass" type="password" value={smtp.password}
                  onChange={(e) => setSmtp((s) => ({ ...s, password: e.target.value }))}
                  placeholder={smtp.hasPassword ? '••••••••••' : 'Contraseña o App Password'}
                  disabled={smtpLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-from-email" className="text-xs">Correo del remitente</Label>
                <Input
                  id="smtp-from-email" type="email" value={smtp.fromEmail}
                  onChange={(e) => setSmtp((s) => ({ ...s, fromEmail: e.target.value }))}
                  placeholder="igual al usuario si lo dejas vacío" disabled={smtpLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-from-name" className="text-xs">Nombre del remitente</Label>
                <Input
                  id="smtp-from-name" value={smtp.fromName}
                  onChange={(e) => setSmtp((s) => ({ ...s, fromName: e.target.value }))}
                  placeholder="Inmobiliaria XYZ" disabled={smtpLoading}
                />
              </div>
            </div>

            {smtpMsg && (
              <div className={`flex items-start gap-2 text-xs p-3 rounded-md ${
                smtpMsg.type === 'ok'
                  ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
              }`}>
                {smtpMsg.type === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-px" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-px" />}
                <span>{smtpMsg.text}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button onClick={saveSmtp} disabled={smtpSaving || smtpLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {smtpSaving ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button onClick={testSmtp} disabled={smtpTesting || !canTest} variant="outline" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {smtpTesting ? 'Enviando…' : 'Enviar correo de prueba'}
              </Button>
              {smtp.hasPassword && (
                <Button onClick={disconnectSmtp} variant="ghost" className="text-destructive hover:bg-destructive/10 gap-1.5 ml-auto">
                  <Trash2 className="h-3.5 w-3.5" /> Desconectar
                </Button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setHelpOpen(!helpOpen)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {helpOpen ? '− Ocultar ayuda' : '+ ¿Cómo obtengo mi contraseña SMTP?'}
            </button>

            {helpOpen && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-4 space-y-3 leading-relaxed">
                <div>
                  <p className="font-semibold text-foreground mb-1">Gmail</p>
                  <p>Activa la verificación en 2 pasos en tu cuenta de Google. Luego ve a Google Account → Seguridad → Contraseñas de aplicaciones y crea una nueva. Usa esa contraseña aquí (no tu contraseña normal de Gmail).</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Outlook / Microsoft 365</p>
                  <p>Si tienes 2FA: account.microsoft.com → Seguridad → Opciones de seguridad avanzadas → Contraseñas de aplicación. Si no, usa tu contraseña normal.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Dominio propio</p>
                  <p>Pídele a tu proveedor de hosting (GoDaddy, Hostinger, etc.) los datos SMTP de tu correo. Generalmente son <code className="bg-background px-1 rounded">mail.tudominio.com</code> puerto 587 con tu correo y contraseña.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
