'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, MessageCircle, ExternalLink, Copy, Check, Loader2, AlertCircle, FileText, ArrowRight } from 'lucide-react'

interface WhatsAppConfig {
  phoneNumberId: string | null
  businessAccountId: string | null
  webhookToken: string | null
  hasAccessToken: boolean
}

export default function WhatsAppConfigPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [businessAccountId, setBusinessAccountId] = useState('')
  const [accessToken, setAccessToken] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/configuracion/whatsapp')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setPhoneNumberId(data.phoneNumberId ?? '')
        setBusinessAccountId(data.businessAccountId ?? '')
      }
    } catch (err) {
      console.error('Error loading WhatsApp config:', err)
    } finally {
      setLoading(false)
    }
  }

  const webhookUrl = config?.webhookToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/whatsapp?token=${config.webhookToken}`
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/configuracion/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId,
          businessAccountId,
          ...(accessToken ? { accessToken } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al guardar')
      } else {
        setSuccess(true)
        setAccessToken('') // Limpia el campo del token después de guardar
        await loadConfig()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('¿Estás seguro de desconectar WhatsApp? Las campañas se detendrán.')) return
    setSaving(true)
    try {
      await fetch('/api/configuracion/whatsapp', { method: 'DELETE' })
      setPhoneNumberId('')
      setBusinessAccountId('')
      setAccessToken('')
      await loadConfig()
    } finally {
      setSaving(false)
    }
  }

  const copyWebhook = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isConnected = !!config?.hasAccessToken && !!config?.phoneNumberId

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/configuracion/general"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Configuración
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">WhatsApp</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            WhatsApp Business
            {isConnected && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Conectado
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Conecta tu cuenta de WhatsApp Business con Meta Cloud API
          </p>
        </div>
      </div>

      {/* Templates management */}
      <Link
        href="/configuracion/whatsapp/plantillas"
        className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:border-green-300 dark:hover:border-green-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Templates de mensajes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crea y administra templates aprobados por Meta — add-on Marketing
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {/* Webhook URL */}
      {webhookUrl && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">URL del Webhook</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Configura esta URL en Meta Developer Portal → WhatsApp → Configuration → Webhook
            </p>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyWebhook}
              className="h-9 shrink-0 gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Verify token: usa el mismo token de la URL (después de <code>?token=</code>)
          </p>
        </div>
      )}

      {/* Credentials form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Credenciales Meta Cloud API</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Obtén estos valores en{' '}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Meta for Developers
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="phone-number-id">Phone Number ID *</Label>
          <Input
            id="phone-number-id"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="123456789012345"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Tu número de teléfono WhatsApp Business (ID, no el número)
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="business-account-id">Business Account ID</Label>
          <Input
            id="business-account-id"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
            placeholder="123456789012345"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            ID de tu WhatsApp Business Account (WABA)
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="access-token">
            Access Token *{' '}
            {config?.hasAccessToken && (
              <span className="text-xs text-green-600 dark:text-green-400 font-normal">
                (configurado — déjalo vacío para mantener el actual)
              </span>
            )}
          </Label>
          <Input
            id="access-token"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={config?.hasAccessToken ? '••••••••' : 'EAAxxxxxxx'}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Token permanente del System User (no el token temporal)
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 p-3">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700 dark:text-green-300">Configuración guardada correctamente</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </span>
            ) : (
              'Guardar configuración'
            )}
          </Button>

          {isConnected && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDisconnect}
              disabled={saving}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Desconectar
            </Button>
          )}
        </div>
      </form>

      {/* Setup guide */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          Guía rápida de configuración
        </h2>
        <ol className="space-y-3 text-xs text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-semibold text-foreground">1.</span>
            <span>
              Crea una app de tipo "Business" en{' '}
              <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Meta for Developers
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-foreground">2.</span>
            <span>Agrega el producto "WhatsApp" a la app y vincula tu número de WhatsApp Business</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-foreground">3.</span>
            <span>Crea un System User en Meta Business Manager y genera un token permanente con permisos <code>whatsapp_business_messaging</code> y <code>whatsapp_business_management</code></span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-foreground">4.</span>
            <span>Copia el Phone Number ID y el Access Token aquí arriba</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-foreground">5.</span>
            <span>En la app de Meta → WhatsApp → Configuration → Webhook, pega la URL del Webhook de arriba y el verify token</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-foreground">6.</span>
            <span>Suscríbete a los eventos <code>messages</code> en el webhook</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-foreground">7.</span>
            <span>Crea un template aprobado por Meta para iniciar conversaciones (ej: <code>property_availability_check</code>)</span>
          </li>
        </ol>
      </div>
    </div>
  )
}
