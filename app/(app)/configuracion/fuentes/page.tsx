'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RestrictedAccess } from '@/components/shared/RestrictedAccess'
import { useSessionPermissions } from '@/hooks/useSessionPermissions'
import { Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle, Loader2, Save, Copy, RefreshCcw } from 'lucide-react'
import { FEED_PORTALS } from '@/lib/portal-feed'

interface FuentesState {
  wasi_company_id: string
  wasi_token_set: boolean
  last_wasi_sync_at: string | null
  meta_webhook_token: string | null
  tiktok_webhook_token: string | null
  feed_token: string | null
  feed_last_access: Record<string, string>
  feed_counts: Record<string, number>
}

export default function FuentesPage() {
  const { permissions, loading: permLoading } = useSessionPermissions()
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [data, setData] = useState<FuentesState>({
    wasi_company_id: '', wasi_token_set: false, last_wasi_sync_at: null,
    meta_webhook_token: null, tiktok_webhook_token: null,
    feed_token: null, feed_last_access: {}, feed_counts: {},
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

  async function generateFeedToken() {
    if (data.feed_token && !window.confirm(
      'Al regenerar, las URLs actuales dejan de funcionar y los portales dejarán de recibir tus propiedades hasta que les envíes las nuevas. ¿Continuar?'
    )) return
    const r = await fetch('/api/configuracion/fuentes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generate_feed_token: true }),
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

  if (!permLoading && !permissions.accessSettings) return <RestrictedAccess />

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

      {/* Encuentra24 leads → CRM */}
      <Encuentra24Card />

      {/* Compre o Alquile (OpenNavent API) */}
      <CompreOAlquileCard />

      {/* Portal XML feeds */}
      <PortalFeedCard
        origin={origin}
        token={data.feed_token}
        lastAccess={data.feed_last_access ?? {}}
        counts={data.feed_counts ?? {}}
        onGenerate={generateFeedToken}
        copied={copiedKey}
        onCopy={(text, key) => copyToClipboard(text, key)}
        loading={loading}
      />

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

function formatAccess(iso: string | undefined): string {
  if (!iso) return 'El portal aún no lo ha leído'
  return 'Leído por el portal: ' + new Date(iso).toLocaleString('es-PA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function PortalFeedCard({
  origin, token, lastAccess, counts, onGenerate, copied, onCopy, loading,
}: {
  origin: string
  token: string | null
  lastAccess: Record<string, string>
  counts: Record<string, number>
  onGenerate: () => void
  copied: string | null
  onCopy: (text: string, key: string) => void
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Portales inmobiliarios (feed XML)</h2>
        {token ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Activo
          </Badge>
        ) : (
          <Badge variant="secondary">No configurado</Badge>
        )}
      </div>
      <Separator />
      <p className="text-sm text-muted-foreground">
        Cada portal lee automáticamente su URL (normalmente una vez al día) y publica las propiedades
        <strong className="text-foreground font-medium"> activas o destacadas, disponibles</strong> y marcadas para ese portal en
        &ldquo;Lugares de publicación&rdquo;. Los cambios que hagas aquí aparecen en el portal en su siguiente lectura (hasta 24 h).
      </p>

      {token ? (
        <div className="space-y-4">
          {FEED_PORTALS.map((p) => {
            const url = `${origin}/feeds/${token}/${p.id}.xml`
            const key = `feed-${p.id}`
            return (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">{p.nombre}</Label>
                  <span className="text-xs text-muted-foreground">
                    {counts[p.id] ?? 0} {(counts[p.id] ?? 0) === 1 ? 'propiedad' : 'propiedades'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input value={url} readOnly className="font-mono text-xs h-8" />
                  <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => onCopy(url, key)}>
                    {copied === key ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                {p.id !== 'todos' && (
                  <p className="text-[11px] text-muted-foreground">{formatAccess(lastAccess[p.id])}</p>
                )}
              </div>
            )
          })}
          <p className="text-xs text-muted-foreground">
            Envía la URL de cada portal a su equipo de integraciones (o pídele a Elevare que lo haga por ti).
            No la publiques: cualquiera con la URL puede ver las propiedades que incluye.
          </p>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={onGenerate}>
              <RefreshCcw className="h-3 w-3" /> Regenerar URLs
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={onGenerate} disabled={loading} className="gap-2">
          Generar URLs de feed
        </Button>
      )}
    </div>
  )
}

interface E24State {
  slug: string
  key_set: boolean
  connected: boolean
  last_sync_at: string | null
  last_error: string | null
  leads_imported: number
}

/**
 * Encuentra24 → CRM. Self-contained: loads/saves via /api/configuracion/encuentra24.
 * New leads are imported automatically every few minutes; the buttons are for
 * testing the credentials and pulling immediately.
 */
function Encuentra24Card() {
  const [state, setState] = useState<E24State | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | 'sync' | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function load() {
    const r = await fetch('/api/configuracion/encuentra24')
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setLoadError(d.error ?? 'No se pudo cargar'); return }
    setLoadError(null)
    setState(d)
    setSlug(d.slug ?? '')
  }
  useEffect(() => { load() }, [])

  async function save() {
    setBusy('save'); setMsg(null)
    try {
      const body: Record<string, string> = { slug: slug.trim() }
      if (apiKey.trim()) body.api_key = apiKey.trim()
      const r = await fetch('/api/configuracion/encuentra24', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'No se pudo guardar')
      setApiKey('')
      setMsg({ type: 'success', text: 'Credenciales guardadas.' })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Error' })
    } finally { setBusy(null) }
  }

  async function action(kind: 'test' | 'sync') {
    setBusy(kind); setMsg(null)
    try {
      const r = await fetch(`/api/configuracion/encuentra24?action=${kind}`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (kind === 'test') {
        if (!r.ok || !d.ok) throw new Error(d.error ?? 'No se pudo conectar')
        setMsg({ type: 'success', text: 'Conexión correcta con Encuentra24.' })
      } else {
        if (!r.ok) throw new Error(d.reason ?? d.error ?? 'No se pudo sincronizar')
        const parts = [`${d.created} nuevos`]
        if (d.merged) parts.push(`${d.merged} ya existían (se agregó nota)`)
        setMsg({ type: 'success', text: d.fetched === 0 ? 'Sin leads nuevos.' : `Importados: ${parts.join(', ')}.` })
      }
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Error' })
    } finally { setBusy(null) }
  }

  const connected = state?.connected
  const dirty = slug.trim() !== (state?.slug ?? '') || apiKey.trim().length > 0

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Encuentra24 — contactos al CRM</h2>
        {!state && !loadError ? (
          <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Cargando</Badge>
        ) : connected ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><AlertCircle className="h-3 w-3 mr-1" /> No configurado</Badge>
        )}
      </div>
      <Separator />
      <p className="text-sm text-muted-foreground">
        Cada persona que te escribe por un anuncio de Encuentra24 entra automáticamente al CRM como lead nuevo,
        vinculado a la propiedad que consultó. Se revisa cada pocos minutos.
      </p>
      {loadError ? (
        <p className="text-xs text-red-600 dark:text-red-400">{loadError}</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="e24-slug">Slug de la cuenta</Label>
            <Input id="e24-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="mi-inmobiliaria" className="font-mono text-sm" disabled={!state || !!busy} />
            <p className="text-xs text-muted-foreground">El identificador de tu cuenta de agencia en Encuentra24.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e24-key">
              API key
              {state?.key_set && !apiKey && <span className="ml-2 text-xs text-muted-foreground font-normal">(guardada)</span>}
            </Label>
            <Input id="e24-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={state?.key_set ? '••••••••••••••••' : 'Pega la API key de Encuentra24'} className="font-mono text-sm" autoComplete="off" disabled={!state || !!busy} />
          </div>
          {msg && (
            <div className={`text-xs flex items-center gap-1.5 ${msg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {msg.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {msg.text}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => action('test')} disabled={!connected || !!busy || dirty} className="gap-2">
              {busy === 'test' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Probar conexión
            </Button>
            <Button size="sm" onClick={save} disabled={!state || !!busy || !dirty} className="gap-2">
              {busy === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
            </Button>
          </div>
          {connected && (
            <>
              <Separator />
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium">{state?.leads_imported ?? 0} leads importados</p>
                  <p className="text-xs text-muted-foreground">
                    Última revisión: {state?.last_sync_at
                      ? new Date(state.last_sync_at).toLocaleString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'todavía no'}
                  </p>
                  {state?.last_error && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 break-words">{state.last_error}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={() => action('sync')} disabled={!!busy} className="gap-2 shrink-0">
                  <RefreshCw className={`h-3.5 w-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} />
                  {busy === 'sync' ? 'Sincronizando…' : 'Sincronizar ahora'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface CoAState {
  platform_ready: boolean
  enabled: boolean
  codigo: string
  vinculada: boolean | null
  last_sync_at: string | null
  last_error: string | null
  leads_imported: number
  listings: { online: number; error: number; pending: number }
}

/**
 * Compre o Alquile via its official API (OpenNavent). The agency activates it
 * and asks its Compre o Alquile account executive to link the code shown here
 * to PropSync; from then on listings marked for the portal are published and
 * contacts arrive in the CRM automatically.
 */
function CompreOAlquileCard() {
  const [state, setState] = useState<CoAState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'activate' | 'deactivate' | 'sync' | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    const r = await fetch('/api/configuracion/comprealquile')
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setLoadError(d.error ?? 'No se pudo cargar'); return }
    setLoadError(null)
    setState(d)
  }
  useEffect(() => { load() }, [])

  async function run(action: 'activate' | 'deactivate' | 'sync') {
    if (action === 'deactivate' && !window.confirm('Se despublicarán tus propiedades de Compre o Alquile y dejarán de entrar sus contactos. ¿Continuar?')) return
    setBusy(action); setMsg(null)
    try {
      const r = await fetch(`/api/configuracion/comprealquile?action=${action}`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.reason ?? d.error ?? 'No se pudo completar')
      if (action === 'sync') {
        if (d.status === 'skipped') setMsg({ type: 'error', text: d.reason })
        else setMsg({ type: 'success', text: `Publicadas: ${d.published} · sin cambios: ${d.unchanged} · despublicadas: ${d.offline} · contactos nuevos: ${d.created}` })
      } else {
        setMsg({ type: 'success', text: action === 'activate' ? 'Compre o Alquile activado.' : 'Compre o Alquile desactivado.' })
      }
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Error' })
    } finally { setBusy(null) }
  }

  const badge = !state && !loadError
    ? <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Cargando</Badge>
    : state?.enabled && state.vinculada
      ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</Badge>
      : state?.enabled
        ? <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Activado · pendiente de vincular</Badge>
        : <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><AlertCircle className="h-3 w-3 mr-1" /> No activado</Badge>

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Compre o Alquile — publicación y contactos</h2>
        {badge}
      </div>
      <Separator />
      <p className="text-sm text-muted-foreground">
        Conexión oficial con Compre o Alquile: las propiedades que marques para este portal se publican, actualizan y
        despublican solas, y cada consulta entra al CRM vinculada a su propiedad.
      </p>
      {loadError ? (
        <p className="text-xs text-red-600 dark:text-red-400">{loadError}</p>
      ) : state && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5">
            <p className="text-xs text-muted-foreground">Tu código de integración PropSync</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-foreground">{state.codigo}</code>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { navigator.clipboard.writeText(state.codigo).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }}>
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pídele a tu ejecutivo de cuenta de Compre o Alquile que vincule tu cuenta a <strong className="text-foreground font-medium">PropSync</strong> con este código.
              {state.vinculada === true && ' ✓ Ya está vinculada.'}
            </p>
          </div>

          {!state.platform_ready && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Elevare está terminando la habilitación de PropSync con Compre o Alquile. Puedes activarlo ya: la publicación empieza sola cuando quede habilitada.
            </p>
          )}

          {state.enabled && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border px-2 py-2"><p className="text-lg font-semibold">{state.listings.online}</p><p className="text-[11px] text-muted-foreground">publicadas</p></div>
              <div className="rounded-lg border border-border px-2 py-2"><p className="text-lg font-semibold">{state.listings.error}</p><p className="text-[11px] text-muted-foreground">con error</p></div>
              <div className="rounded-lg border border-border px-2 py-2"><p className="text-lg font-semibold">{state.leads_imported}</p><p className="text-[11px] text-muted-foreground">contactos</p></div>
            </div>
          )}

          {state.last_error && <p className="text-xs text-red-600 dark:text-red-400 break-words">{state.last_error}</p>}
          {msg && (
            <div className={`text-xs flex items-center gap-1.5 ${msg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {msg.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {msg.text}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {state.last_sync_at
                ? `Última sincronización: ${new Date(state.last_sync_at).toLocaleString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : 'Todavía no se ha sincronizado'}
            </p>
            <div className="flex gap-2">
              {state.enabled ? (
                <>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => run('deactivate')} disabled={!!busy}>Desactivar</Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => run('sync')} disabled={!!busy || !state.platform_ready}>
                    <RefreshCw className={`h-3.5 w-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} />
                    {busy === 'sync' ? 'Sincronizando…' : 'Sincronizar ahora'}
                  </Button>
                </>
              ) : (
                <Button size="sm" className="gap-2" onClick={() => run('activate')} disabled={!!busy}>
                  {busy === 'activate' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Activar Compre o Alquile
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
