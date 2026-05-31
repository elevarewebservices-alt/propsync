'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle, Loader2, Save, Copy, RefreshCcw } from 'lucide-react'

interface FuentesState {
  wasi_company_id: string
  wasi_token_set: boolean
  last_wasi_sync_at: string | null
  meta_webhook_token: string | null
  tiktok_webhook_token: string | null
}

export default function FuentesPage() {
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [data, setData] = useState<FuentesState>({
    wasi_company_id: '', wasi_token_set: false, last_wasi_sync_at: null,
    meta_webhook_token: null, tiktok_webhook_token: null,
  })
  const [companyIdInput, setCompanyIdInput] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const r = await fetch('/api/configuracion/fuentes')
      if (r.ok) {
        const d = await r.json()
        setData(d)
        setCompanyIdInput(d.wasi_company_id || '')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const payload: Record<string, string> = { wasi_company_id: companyIdInput.trim() }
      if (tokenInput.trim()) payload.wasi_token = tokenInput.trim()
      const r = await fetch('/api/configuracion/fuentes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error || 'Error al guardar')
      }
      setTokenInput('')
      setSaveMsg({ type: 'success', text: 'Credenciales guardadas correctamente.' })
      await loadData()
    } catch (err) {
      setSaveMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const r = await fetch('/api/wasi/sync', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error al sincronizar')
      setSyncMsg({ type: 'success', text: d.message || `${d.synced ?? 0} propiedades sincronizadas.` })
      await loadData()
    } catch (err) {
      setSyncMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al sincronizar' })
    } finally {
      setSyncing(false)
    }
  }

  async function generateToken(type: 'meta' | 'tiktok') {
    const r = await fetch('/api/configuracion/fuentes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(type === 'meta' ? { generate_meta_token: true } : { generate_tiktok_token: true }),
    })
    if (r.ok) await loadData()
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tudominio.com'
  const isConnected = Boolean(data.wasi_company_id) && data.wasi_token_set
  const hasUnsavedChanges = companyIdInput.trim() !== (data.wasi_company_id || '') || tokenInput.trim().length > 0

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fuentes de datos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configura las integraciones con CRM y plataformas de leads
        </p>
      </div>

      {/* Wasi */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Wasi CRM</h2>
          {loading ? (
            <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Cargando</Badge>
          ) : isConnected ? (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertCircle className="h-3 w-3 mr-1" /> No configurado
            </Badge>
          )}
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company-id">ID de Compañía Wasi</Label>
            <Input id="company-id" value={companyIdInput} onChange={(e) => setCompanyIdInput(e.target.value)}
              disabled={loading || saving} placeholder="2946576" className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">Lo encuentras en tu panel de Wasi → Configuración → API.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wasi-token">
              Token de API
              {data.wasi_token_set && !tokenInput && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">(Token guardado)</span>
              )}
            </Label>
            <div className="relative">
              <Input id="wasi-token" type={showToken ? 'text' : 'password'} value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)} disabled={loading || saving}
                placeholder={data.wasi_token_set ? '••••••••••••••••' : 'Pega tu token de Wasi'}
                className="pr-10 font-mono text-sm" />
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {saveMsg && (
            <div className={`text-xs flex items-center gap-1.5 ${saveMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {saveMsg.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {saveMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={loading || saving || !hasUnsavedChanges} className="gap-2">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Guardando...' : 'Guardar credenciales'}
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between rounded-lg bg-muted/40 border border-border px-4 py-3">
            <div>
              <p className="text-sm text-foreground font-medium">Última sincronización</p>
              <p className="text-xs text-muted-foreground">
                {data.last_wasi_sync_at
                  ? new Date(data.last_wasi_sync_at).toLocaleString('es-PA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Nunca sincronizado'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || !isConnected || loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </Button>
          </div>
          {syncMsg && (
            <div className={`text-xs flex items-center gap-1.5 px-1 ${syncMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {syncMsg.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {syncMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Meta Leads */}
      <WebhookTokenCard
        title="Meta Lead Ads"
        description="Recibe leads de Facebook e Instagram directamente en el CRM cuando un usuario completa un formulario en tus anuncios."
        token={data.meta_webhook_token}
        webhookUrl={`${origin}/api/webhooks/meta-leads?token=${data.meta_webhook_token ?? 'TOKEN'}`}
        onGenerate={() => generateToken('meta')}
        copied={copiedKey}
        onCopy={(text, key) => copyToClipboard(text, key)}
        tokenKey="meta"
        loading={loading}
      />

      {/* TikTok Leads */}
      <WebhookTokenCard
        title="TikTok Lead Generation"
        description="Recibe leads de TikTok Ads cuando un usuario completa un formulario en tus campañas de generación de leads."
        token={data.tiktok_webhook_token}
        webhookUrl={`${origin}/api/webhooks/tiktok-leads?token=${data.tiktok_webhook_token ?? 'TOKEN'}`}
        onGenerate={() => generateToken('tiktok')}
        copied={copiedKey}
        onCopy={(text, key) => copyToClipboard(text, key)}
        tokenKey="tiktok"
        loading={loading}
      />

      {/* WhatsApp */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">WhatsApp Business</h2>
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Add-on</Badge>
        </div>
        <Separator />
        <p className="text-sm text-muted-foreground">
          La integración con WhatsApp Business requiere configuración personalizada. El equipo de Elevare la instala y gestiona por ti.
        </p>
        <a href="mailto:gerencia@elevarewebservices.com?subject=Activación%20WhatsApp%20Business"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
          Solicitar activación
        </a>
      </div>
    </div>
  )
}

function WebhookTokenCard({
  title, description, token, webhookUrl, onGenerate, copied, onCopy, tokenKey, loading,
}: {
  title: string
  description: string
  token: string | null
  webhookUrl: string
  onGenerate: () => void
  copied: string | null
  onCopy: (text: string, key: string) => void
  tokenKey: string
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {token ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Activo
          </Badge>
        ) : (
          <Badge variant="secondary">No configurado</Badge>
        )}
      </div>
      <Separator />
      <p className="text-sm text-muted-foreground">{description}</p>

      {token ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">URL del Webhook</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs h-8" />
              <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5"
                onClick={() => onCopy(webhookUrl, `${tokenKey}-url`)}>
                {copied === `${tokenKey}-url` ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={onGenerate}>
              <RefreshCcw className="h-3 w-3" /> Regenerar token
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={onGenerate} disabled={loading} className="gap-2">
          Generar URL de webhook
        </Button>
      )}
    </div>
  )
}
