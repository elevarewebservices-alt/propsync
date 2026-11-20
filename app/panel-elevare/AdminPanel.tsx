'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AddonOption, CompanyRow, PaymentRow, PromoRow } from './types'
import { FEED_PORTALS } from '@/lib/portal-feed'

// Elevare back office: manual (ACH) billing, plans, trials, add-ons, promo
// codes and hand-made accounts. Every action goes through /api/admin/*, which
// re-verifies the platform-admin identity server-side — this UI holds no power.

const GRACE_DAYS = 3 // keep in sync with PAYMENT_GRACE_DAYS in lib/subscription.ts
const DAY = 86_400_000

type Tab = 'empresas' | 'pagos' | 'promo' | 'nueva'
type Filter = 'todas' | 'activas' | 'prueba' | 'por_vencer' | 'bloqueadas'

interface Status {
  key: 'grandfathered' | 'trial' | 'trial_expired' | 'active' | 'due_soon' | 'lapsed' | 'suspended'
  label: string
  tone: string
  blocked: boolean
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function statusOf(c: CompanyRow): Status {
  const now = Date.now()
  const s = c.subscription_status
  if (s === null) return { key: 'grandfathered', label: 'Sin facturación', tone: 'bg-gray-100 text-gray-600', blocked: false }
  if (s === 'trialing') {
    const end = c.trial_ends_at ? new Date(c.trial_ends_at).getTime() : 0
    if (end > now) {
      const days = Math.ceil((end - now) / DAY)
      return { key: 'trial', label: `Prueba · ${days} día${days === 1 ? '' : 's'}`, tone: 'bg-sky-100 text-sky-700', blocked: false }
    }
    return { key: 'trial_expired', label: 'Prueba vencida', tone: 'bg-red-100 text-red-700', blocked: true }
  }
  if (s === 'active') {
    if (c.subscription_provider === 'paypal' || !c.current_period_end) {
      return { key: 'active', label: c.subscription_provider === 'paypal' ? 'Activa · PayPal' : 'Activa', tone: 'bg-emerald-100 text-emerald-700', blocked: false }
    }
    const end = new Date(c.current_period_end).getTime()
    if (end + GRACE_DAYS * DAY <= now) return { key: 'lapsed', label: 'Pago vencido', tone: 'bg-red-100 text-red-700', blocked: true }
    if (end <= now) return { key: 'due_soon', label: 'En gracia', tone: 'bg-amber-100 text-amber-800', blocked: false }
    if (end - now <= 7 * DAY) return { key: 'due_soon', label: `Vence ${fmtDate(c.current_period_end)}`, tone: 'bg-amber-100 text-amber-800', blocked: false }
    return { key: 'active', label: `Pagada hasta ${fmtDate(c.current_period_end)}`, tone: 'bg-emerald-100 text-emerald-700', blocked: false }
  }
  return { key: 'suspended', label: 'Suspendida', tone: 'bg-red-100 text-red-700', blocked: true }
}

async function call(url: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (res.ok) return null
    const data = await res.json().catch(() => ({}))
    return data.error ?? `Error ${res.status}`
  } catch {
    return 'Error de red'
  }
}

const input = 'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30'
const btn = 'rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50'
const btnPrimary = `${btn} bg-gray-900 text-white hover:bg-gray-700`
const btnGhost = `${btn} border border-gray-300 bg-white hover:bg-gray-50`

export function AdminPanel({
  companies, payments, promoCodes, paymentsTableReady, assistantLimits, addons,
}: {
  addons: AddonOption[]
  companies: CompanyRow[]
  payments: PaymentRow[]
  promoCodes: PromoRow[]
  paymentsTableReady: boolean
  assistantLimits: Record<string, number>
}) {
  const [tab, setTab] = useState<Tab>('empresas')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = companies.find((c) => c.id === selectedId) ?? null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'empresas', label: `Empresas (${companies.length})` },
    { id: 'pagos', label: 'Pagos' },
    { id: 'promo', label: 'Códigos promo' },
    { id: 'nueva', label: '+ Nueva cuenta' },
  ]

  return (
    <div className="space-y-4">
      {!paymentsTableReady && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Falta correr <code className="font-mono">supabase/migrations/030_manual_payments.sql</code> en Supabase — registrar pagos fallará hasta entonces.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${tab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
        <DemoResetButton />
      </div>

      {tab === 'empresas' && <CompaniesTab companies={companies} assistantLimits={assistantLimits} onOpen={setSelectedId} />}
      {tab === 'pagos' && <PaymentsTab payments={payments} companies={companies} />}
      {tab === 'promo' && <PromoTab codes={promoCodes} />}
      {tab === 'nueva' && <NewAccountTab onCreated={() => setTab('empresas')} />}

      {selected && (
        <CompanyDrawer
          company={selected}
          payments={payments.filter((p) => p.company_id === selected.id)}
          addons={addons}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function DemoResetButton() {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle')
  const [detail, setDetail] = useState('')

  async function reset() {
    if (!window.confirm('¿Reiniciar los datos de la demo pública? Se borran los cambios de los visitantes.')) return
    setState('busy')
    try {
      const res = await fetch('/api/admin/demo-reset', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setState('error'); setDetail(data.error ?? `Error ${res.status}`); return }
      setState('ok')
      setDetail(`${data.properties} propiedades · ${data.contacts} contactos`)
      router.refresh()
    } catch {
      setState('error')
      setDetail('Error de red')
    }
  }

  return (
    <div className="ml-auto mb-1 flex items-center gap-2">
      {state !== 'idle' && state !== 'busy' && (
        <span className={`text-xs ${state === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{detail}</span>
      )}
      <button onClick={reset} disabled={state === 'busy'} className={btnGhost}>
        {state === 'busy' ? 'Reiniciando…' : 'Reiniciar demo'}
      </button>
    </div>
  )
}

// ── Empresas ────────────────────────────────────────────────────────────────

function CompaniesTab({ companies, assistantLimits, onOpen }: {
  companies: CompanyRow[]
  assistantLimits: Record<string, number>
  onOpen: (id: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('todas')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return companies
      .map((c) => ({ c, st: statusOf(c) }))
      .filter(({ c, st }) => {
        if (term && !`${c.nombre} ${c.email ?? ''}`.toLowerCase().includes(term)) return false
        switch (filter) {
          case 'activas': return st.key === 'active' || st.key === 'grandfathered'
          case 'prueba': return st.key === 'trial'
          case 'por_vencer': return st.key === 'due_soon'
          case 'bloqueadas': return st.blocked
          default: return true
        }
      })
  }, [companies, filter, q])

  const filters: { id: Filter; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'activas', label: 'Activas' },
    { id: 'prueba', label: 'En prueba' },
    { id: 'por_vencer', label: 'Por vencer' },
    { id: 'bloqueadas', label: 'Bloqueadas' },
  ]

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-2.5 py-1 rounded-full border ${filter === f.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            {f.label}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa o email…" className={`${input} ml-auto max-w-xs`} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Empresa</th>
              <th className="text-left px-4 py-2.5">Plan</th>
              <th className="text-left px-4 py-2.5">Estado</th>
              <th className="text-right px-4 py-2.5">Propiedades</th>
              <th className="text-right px-4 py-2.5">Contactos</th>
              <th className="text-right px-4 py-2.5">Agentes</th>
              <th className="text-right px-4 py-2.5">IA mes</th>
              <th className="text-left px-4 py-2.5">Registrada</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ c, st }) => {
              const limit = assistantLimits[c.plan_id] ?? assistantLimits.starter
              return (
                <tr key={c.id} onClick={() => onOpen(c.id)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{c.nombre}</div>
                    <div className="text-xs text-gray-400">{c.email ?? '—'}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.plan_id === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {c.plan_id === 'pro' ? 'Pro' : 'Individual'}
                    </span>
                    {c.addons.length > 0 && <span className="ml-1 text-xs text-violet-600">+{c.addons.join(', ')}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${st.tone}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{c.propiedades}</td>
                  <td className="px-4 py-2.5 text-right">{c.contactos}</td>
                  <td className="px-4 py-2.5 text-right">{c.agentes}</td>
                  <td className={`px-4 py-2.5 text-right ${c.iaMes / limit >= 0.8 ? 'text-amber-600 font-medium' : ''}`}>
                    {c.iaMes}<span className="text-gray-300 text-xs"> / {limit.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Company drawer (all per-company actions) ────────────────────────────────

function CompanyDrawer({ company: c, payments, addons, onClose }: {
  company: CompanyRow
  payments: PaymentRow[]
  addons: AddonOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const st = statusOf(c)

  const [amount, setAmount] = useState(c.plan_id === 'pro' ? '60' : '30')
  const [months, setMonths] = useState('1')
  const [method, setMethod] = useState('ach')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [trialDays, setTrialDays] = useState('7')
  const [periodEnd, setPeriodEnd] = useState(c.current_period_end?.slice(0, 10) ?? '')
  const [accessLink, setAccessLink] = useState<string | null>(null)
  const [e24Slug, setE24Slug] = useState(c.e24?.slug ?? '')
  const [e24Key, setE24Key] = useState('')
  const [coaCodigo, setCoaCodigo] = useState(c.coa?.codigo ?? '')
  const [coaPlan, setCoaPlan] = useState(c.coa?.plan ?? '')

  async function run(fn: () => Promise<string | null>, okText: string) {
    setBusy(true)
    setMsg(null)
    const err = await fn()
    setBusy(false)
    setMsg(err ? { ok: false, text: err } : { ok: true, text: okText })
    if (!err) router.refresh()
  }

  const patch = (body: Record<string, unknown>, okText: string) =>
    run(() => call(`/api/admin/companies/${c.id}`, 'PATCH', body), okText)

  const extendTrial = () => {
    const base = Math.max(Date.now(), c.trial_ends_at ? new Date(c.trial_ends_at).getTime() : 0)
    const n = Number(trialDays)
    if (!Number.isInteger(n) || n < 1) return setMsg({ ok: false, text: 'Días inválidos' })
    patch({ subscription_status: 'trialing', trial_ends_at: new Date(base + n * DAY).toISOString() }, `Prueba extendida ${n} días`)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-start justify-between border-b bg-white px-5 py-4">
          <div>
            <h3 className="font-semibold">{c.nombre}</h3>
            <p className="text-xs text-gray-500">{c.email ?? '—'}</p>
            <span className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${st.tone}`}>{st.label}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none" aria-label="Cerrar">×</button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {msg && (
            <div className={`rounded-md px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>
          )}

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Registrar pago</h4>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-600">Monto (USD)
                <input className={input} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label className="text-xs text-gray-600">Meses
                <input className={input} type="number" min="1" max="24" value={months} onChange={(e) => setMonths(e.target.value)} />
              </label>
              <label className="text-xs text-gray-600">Método
                <select className={input} value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="ach">ACH</option>
                  <option value="cash">Efectivo</option>
                  <option value="paypal">PayPal (manual)</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="text-xs text-gray-600">Referencia
                <input className={input} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Nº de transferencia" />
              </label>
            </div>
            <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" />
            <button
              disabled={busy}
              className={`${btnPrimary} w-full`}
              onClick={() => run(
                () => call('/api/admin/payments', 'POST', { companyId: c.id, amount: Number(amount), months: Number(months), method, reference, notes }),
                'Pago registrado y cuenta activada',
              )}
            >
              Registrar pago y activar
            </button>
            <p className="text-xs text-gray-400">
              Extiende desde la fecha pagada actual si aún no vence. Sin pago nuevo, la cuenta se bloquea {GRACE_DAYS} días después del vencimiento.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Plan</h4>
            <div className="flex gap-2">
              {(['starter', 'pro'] as const).map((p) => (
                <button
                  key={p}
                  disabled={busy || c.plan_id === p}
                  onClick={() => patch({ plan_id: p }, `Plan cambiado a ${p === 'pro' ? 'Pro' : 'Individual'}`)}
                  className={c.plan_id === p ? `${btnPrimary} flex-1` : `${btnGhost} flex-1`}
                >
                  {p === 'pro' ? 'Pro' : 'Individual'}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Fechas</h4>
            <div className="flex items-end gap-2">
              <label className="flex-1 text-xs text-gray-600">Extender prueba (días)
                <input className={input} type="number" min="1" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />
              </label>
              <button disabled={busy} onClick={extendTrial} className={btnGhost}>Extender</button>
            </div>
            <p className="text-xs text-gray-400">Prueba termina: {fmtDate(c.trial_ends_at)}</p>
            <div className="flex items-end gap-2">
              <label className="flex-1 text-xs text-gray-600">Pagada hasta (manual)
                <input className={input} type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </label>
              <button
                disabled={busy || !periodEnd}
                onClick={() => patch({ subscription_status: 'active', current_period_end: new Date(`${periodEnd}T23:59:59`).toISOString() }, 'Fecha actualizada')}
                className={btnGhost}
              >
                Guardar
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Acceso</h4>
            {st.key === 'suspended' ? (
              <button disabled={busy} onClick={() => patch({ subscription_status: 'active' }, 'Cuenta reactivada')} className={`${btnGhost} w-full`}>
                Reactivar cuenta
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => { if (window.confirm(`¿Suspender ${c.nombre}? Perderán acceso hasta reactivarla.`)) patch({ subscription_status: 'canceled' }, 'Cuenta suspendida') }}
                className={`${btn} w-full border border-red-300 bg-white text-red-700 hover:bg-red-50`}
              >
                Suspender cuenta
              </button>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Add-ons</h4>
            {addons.map((a) => {
              const on = c.addons.includes(a.id)
              return (
                <label key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>
                    {a.nombre}
                    {a.requiresPlan === 'pro' && c.plan_id !== 'pro' && <span className="ml-1 text-xs text-amber-600">(requiere Pro)</span>}
                  </span>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={busy}
                    onChange={() => run(() => call('/api/admin/addons', 'POST', { companyId: c.id, addonId: a.id, activo: !on }), on ? 'Add-on desactivado' : 'Add-on activado')}
                  />
                </label>
              )
            })}
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Acceso del titular</h4>
            <p className="text-[11px] text-gray-500">Si la invitación venció (24 h) o no le llegó, genera un enlace nuevo para que cree su contraseña.</p>
            <div className="flex gap-2">
              <button
                disabled={busy}
                className={`${btnGhost} flex-1`}
                onClick={() => run(async () => {
                  try {
                    const res = await fetch('/api/admin/accounts/invite-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: c.id, send: true }) })
                    const d = await res.json().catch(() => ({}))
                    if (!res.ok) return d.error ?? `Error ${res.status}`
                    setAccessLink(d.link)
                    return null
                  } catch { return 'Error de red' }
                }, 'Enlace generado y enviado por correo')}
              >
                Reenviar invitación
              </button>
            </div>
            {accessLink && (
              <div className="flex gap-2">
                <input readOnly value={accessLink} className={`${input} font-mono text-[11px]`} onFocus={(e) => e.currentTarget.select()} />
                <button className={btnGhost} onClick={() => { void navigator.clipboard.writeText(accessLink); setMsg({ ok: true, text: 'Enlace copiado' }) }}>Copiar</button>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Encuentra24 · leads al CRM</h4>
            {c.e24 === null ? (
              <p className="text-xs text-amber-700">Aplica la migración 032 para conectar Encuentra24.</p>
            ) : (
              <>
                <input className={input} placeholder="Slug de la cuenta (ej. mi-inmobiliaria)" value={e24Slug} onChange={(e) => setE24Slug(e.target.value)} />
                <input className={input} type="password" autoComplete="off" placeholder={c.e24.key_set ? 'API key guardada — escribe para reemplazar' : 'API key de Encuentra24'} value={e24Key} onChange={(e) => setE24Key(e.target.value)} />
                <div className="flex gap-2">
                  <button
                    disabled={busy || (!e24Key.trim() && e24Slug.trim() === (c.e24.slug ?? ''))}
                    onClick={() => { patch({ encuentra24_slug: e24Slug, ...(e24Key.trim() ? { encuentra24_api_key: e24Key } : {}) }, 'Encuentra24 guardado'); setE24Key('') }}
                    className={`${btnPrimary} flex-1`}
                  >
                    Guardar
                  </button>
                  <button
                    disabled={busy || !c.e24.slug || !c.e24.key_set}
                    onClick={() => patch({ sync_encuentra24: true }, 'Sincronización de Encuentra24 completada')}
                    className={`${btnGhost} flex-1`}
                  >
                    Sincronizar ahora
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  {c.e24.leads_imported} leads importados · última revisión {c.e24.last_sync_at ? fmtDate(c.e24.last_sync_at) : 'nunca'}
                </p>
                {c.e24.last_error && <p className="text-[11px] text-red-600 break-words">{c.e24.last_error}</p>}
              </>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Compre o Alquile · API OpenNavent</h4>
            {c.coa === null ? (
              <p className="text-xs text-amber-700">Aplica la migración 033 para conectar Compre o Alquile.</p>
            ) : (
              <>
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>Integración activa</span>
                  <input type="checkbox" checked={c.coa.enabled} disabled={busy}
                    onChange={() => { if (c.coa!.enabled && !window.confirm('Se despublicarán sus propiedades de Compre o Alquile. ¿Desactivar?')) return; patch({ comprealquile_enabled: !c.coa!.enabled }, c.coa!.enabled ? 'Compre o Alquile desactivado' : 'Compre o Alquile activado') }} />
                </label>
                <input className={input} placeholder="Código de inmobiliaria (vacío = automático)" value={coaCodigo} onChange={(e) => setCoaCodigo(e.target.value)} />
                <input className={input} placeholder="Plan de publicación (opcional)" value={coaPlan} onChange={(e) => setCoaPlan(e.target.value)} />
                <div className="flex gap-2">
                  <button
                    disabled={busy || (coaCodigo.trim() === (c.coa.codigo ?? '') && coaPlan.trim() === (c.coa.plan ?? ''))}
                    onClick={() => patch({ comprealquile_codigo: coaCodigo, comprealquile_plan: coaPlan }, 'Compre o Alquile guardado')}
                    className={`${btnPrimary} flex-1`}
                  >
                    Guardar
                  </button>
                  <button disabled={busy || !c.coa.enabled} onClick={() => patch({ sync_comprealquile: true }, 'Sincronización de Compre o Alquile completada')} className={`${btnGhost} flex-1`}>
                    Sincronizar ahora
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  {c.coa.leads_imported} contactos importados · última sincronización {c.coa.last_sync_at ? fmtDate(c.coa.last_sync_at) : 'nunca'}
                </p>
                {c.coa.last_error && <p className="text-[11px] text-red-600 break-words">{c.coa.last_error}</p>}
              </>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Feeds para portales</h4>
            {c.feed_token ? (
              <>
                {FEED_PORTALS.map((p) => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/feeds/${c.feed_token}/${p.id}.xml`
                  const seen = c.feed_last_access[p.id]
                  return (
                    <div key={p.id} className="rounded-md border px-3 py-2 text-sm space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{p.nombre}</span>
                        <button className="text-xs text-blue-600 hover:underline" onClick={() => { void navigator.clipboard.writeText(url); setMsg({ ok: true, text: `URL de ${p.nombre} copiada` }) }}>
                          Copiar URL
                        </button>
                      </div>
                      <p className="font-mono text-[11px] text-gray-500 break-all">{url}</p>
                      {p.id !== 'todos' && (
                        <p className="text-[11px] text-gray-400">{seen ? `Última lectura del portal: ${fmtDate(seen)}` : 'El portal aún no lo ha leído'}</p>
                      )}
                    </div>
                  )
                })}
                <button
                  disabled={busy}
                  onClick={() => { if (window.confirm('Las URLs actuales dejarán de funcionar. ¿Regenerar?')) patch({ generate_feed_token: true }, 'URLs regeneradas') }}
                  className={`${btnGhost} w-full text-xs`}
                >
                  Regenerar URLs
                </button>
              </>
            ) : (
              <button disabled={busy} onClick={() => patch({ generate_feed_token: true }, 'URLs de feed generadas')} className={`${btnGhost} w-full`}>
                Generar URLs de feed
              </button>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Historial de pagos</h4>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400">Sin pagos registrados.</p>
            ) : (
              <ul className="divide-y rounded-md border text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="px-3 py-2">
                    <div className="flex justify-between">
                      <span className="font-medium">${Number(p.amount).toFixed(2)} · {p.method.toUpperCase()}</span>
                      <span className="text-xs text-gray-500">{fmtDate(p.created_at)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Cubre {fmtDate(p.period_start)} → {fmtDate(p.period_end)}{p.reference ? ` · Ref ${p.reference}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-[11px] text-gray-400 font-mono break-all">ID {c.id}</p>
        </div>
      </div>
    </div>
  )
}

// ── Pagos ───────────────────────────────────────────────────────────────────

function PaymentsTab({ payments, companies }: { payments: PaymentRow[]; companies: CompanyRow[] }) {
  const names = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.nombre])), [companies])
  const month = new Date().toISOString().slice(0, 7)
  const thisMonth = payments.filter((p) => p.created_at.slice(0, 7) === month)
  const total = thisMonth.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Cobrado este mes</p>
          <p className="text-xs text-gray-500">{thisMonth.length} pago{thisMonth.length === 1 ? '' : 's'} registrados · {month}</p>
        </div>
        <p className="text-2xl font-bold text-emerald-600">${total.toFixed(2)}</p>
      </div>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Fecha</th>
              <th className="text-left px-4 py-2.5">Empresa</th>
              <th className="text-right px-4 py-2.5">Monto</th>
              <th className="text-left px-4 py-2.5">Método</th>
              <th className="text-left px-4 py-2.5">Referencia</th>
              <th className="text-left px-4 py-2.5">Cubre hasta</th>
              <th className="text-left px-4 py-2.5">Registró</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(p.created_at)}</td>
                <td className="px-4 py-2.5">{names[p.company_id] ?? p.company_id.slice(0, 8)}</td>
                <td className="px-4 py-2.5 text-right font-medium">${Number(p.amount).toFixed(2)}</td>
                <td className="px-4 py-2.5 text-xs">{p.method.toUpperCase()}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{p.reference ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs">{fmtDate(p.period_end)}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{p.created_by_email}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin pagos todavía. Regístralos desde la ficha de cada empresa.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Códigos promo ───────────────────────────────────────────────────────────

function PromoTab({ codes }: { codes: PromoRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({ code: '', descripcion: '', trial_extra_days: '0', free_months: '0', discount_percent: '0', max_uses: '', expires_at: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  async function create() {
    setBusy(true)
    setErr(null)
    const e = await call('/api/admin/promo-codes', 'POST', {
      ...form,
      trial_extra_days: Number(form.trial_extra_days),
      free_months: Number(form.free_months),
      discount_percent: Number(form.discount_percent),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null,
    })
    setBusy(false)
    if (e) return setErr(e)
    setForm({ code: '', descripcion: '', trial_extra_days: '0', free_months: '0', discount_percent: '0', max_uses: '', expires_at: '' })
    router.refresh()
  }

  async function toggle(id: string, activo: boolean) {
    setBusy(true)
    const e = await call('/api/admin/promo-codes', 'PATCH', { id, activo })
    setBusy(false)
    if (e) setErr(e)
    else router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold">Crear código</h3>
        {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <label className="text-xs text-gray-600 col-span-2 md:col-span-1">Código
            <input className={`${input} uppercase`} value={form.code} onChange={set('code')} placeholder="PANAMA30" />
          </label>
          <label className="text-xs text-gray-600 col-span-2 md:col-span-3">Descripción
            <input className={input} value={form.descripcion} onChange={set('descripcion')} placeholder="Para referidos de…" />
          </label>
          <label className="text-xs text-gray-600">Días extra de prueba
            <input className={input} type="number" min="0" value={form.trial_extra_days} onChange={set('trial_extra_days')} />
          </label>
          <label className="text-xs text-gray-600">Meses gratis
            <input className={input} type="number" min="0" value={form.free_months} onChange={set('free_months')} />
          </label>
          <label className="text-xs text-gray-600">Máx. usos
            <input className={input} type="number" min="1" value={form.max_uses} onChange={set('max_uses')} placeholder="Ilimitado" />
          </label>
          <label className="text-xs text-gray-600">Expira
            <input className={input} type="date" value={form.expires_at} onChange={set('expires_at')} />
          </label>
        </div>
        <button disabled={busy || !form.code} onClick={create} className={btnPrimary}>Crear código</button>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Código</th>
              <th className="text-left px-4 py-2.5">Beneficio</th>
              <th className="text-right px-4 py-2.5">Usos</th>
              <th className="text-left px-4 py-2.5">Expira</th>
              <th className="text-left px-4 py-2.5">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {codes.map((p) => {
              const perks = [
                p.trial_extra_days ? `+${p.trial_extra_days} días prueba` : '',
                p.free_months ? `${p.free_months} mes${p.free_months === 1 ? '' : 'es'} gratis` : '',
                p.discount_percent ? `${p.discount_percent}% desc.` : '',
              ].filter(Boolean).join(' · ')
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-mono font-medium">{p.code}</div>
                    {p.descripcion && <div className="text-xs text-gray-400">{p.descripcion}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{perks || '—'}</td>
                  <td className="px-4 py-2.5 text-right">{p.uses}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(p.expires_at)}</td>
                  <td className="px-4 py-2.5">
                    <button disabled={busy} onClick={() => toggle(p.id, !p.activo)} className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {codes.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin códigos todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Nueva cuenta ────────────────────────────────────────────────────────────

function NewAccountTab({ onCreated }: { onCreated: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [doneLink, setDoneLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const empty = { empresa: '', nombre: '', email: '', plan_id: 'starter', mode: 'active', amount: '30', months: '1', reference: '' }
  const [form, setForm] = useState(empty)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...form, [k]: e.target.value }
    if (k === 'plan_id') next.amount = e.target.value === 'pro' ? '60' : '30'
    setForm(next)
  }

  async function submit() {
    setBusy(true)
    setErr(null)
    let companyId: string | null = null
    let inviteLink: string | null = null
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa: form.empresa, nombre: form.nombre, email: form.email, plan_id: form.plan_id, mode: form.mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setBusy(false); return setErr(data.error ?? `Error ${res.status}`) }
      companyId = data.companyId
      inviteLink = data.inviteLink ?? null
    } catch {
      setBusy(false)
      return setErr('Error de red')
    }

    if (form.mode === 'active' && companyId) {
      const e = await call('/api/admin/payments', 'POST', {
        companyId, amount: Number(form.amount), months: Number(form.months), method: 'ach', reference: form.reference,
      })
      if (e) setErr(`Cuenta creada, pero el pago no se registró: ${e}. Regístralo desde su ficha.`)
    }
    setBusy(false)
    setDone(form.email)
    setDoneLink(inviteLink)
    setLinkCopied(false)
    setForm(empty)
    router.refresh()
  }

  return (
    <div className="max-w-lg rounded-xl border bg-white p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Crear cuenta de cliente</h3>
        <p className="text-xs text-gray-500">Le llega un correo para crear su contraseña, y aquí te queda el enlace para mandárselo también por WhatsApp. La cuenta queda lista con el CRM configurado.</p>
      </div>
      {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {done && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Invitación enviada a <b>{done}</b>. <button onClick={onCreated} className="underline">Ver empresas</button>
          {doneLink && (
            <div className="mt-2 space-y-1">
              <p className="text-xs">Enlace de acceso (vence en 24 h) — mándaselo por WhatsApp si el correo no llega:</p>
              <div className="flex gap-2">
                <input readOnly value={doneLink} className={`${input} font-mono text-[11px]`} onFocus={(e) => e.currentTarget.select()} />
                <button className={btnGhost} onClick={() => { void navigator.clipboard.writeText(doneLink); setLinkCopied(true) }}>{linkCopied ? 'Copiado' : 'Copiar'}</button>
              </div>
            </div>
          )}
        </div>
      )}
      <label className="block text-xs text-gray-600">Nombre de la empresa / corredor
        <input className={input} value={form.empresa} onChange={set('empresa')} placeholder="González Bienes Raíces" />
      </label>
      <label className="block text-xs text-gray-600">Nombre del titular
        <input className={input} value={form.nombre} onChange={set('nombre')} />
      </label>
      <label className="block text-xs text-gray-600">Email
        <input className={input} type="email" value={form.email} onChange={set('email')} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">Plan
          <select className={input} value={form.plan_id} onChange={set('plan_id')}>
            <option value="starter">Individual</option>
            <option value="pro">Pro</option>
          </select>
        </label>
        <label className="text-xs text-gray-600">Acceso inicial
          <select className={input} value={form.mode} onChange={set('mode')}>
            <option value="active">Pagada (registrar primer pago)</option>
            <option value="trial">Prueba de 15 días</option>
          </select>
        </label>
      </div>
      {form.mode === 'active' && (
        <div className="grid grid-cols-3 gap-2 rounded-md bg-gray-50 p-3">
          <label className="text-xs text-gray-600">Monto (USD)
            <input className={input} type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} />
          </label>
          <label className="text-xs text-gray-600">Meses
            <input className={input} type="number" min="1" max="24" value={form.months} onChange={set('months')} />
          </label>
          <label className="text-xs text-gray-600">Ref. ACH
            <input className={input} value={form.reference} onChange={set('reference')} />
          </label>
        </div>
      )}
      <button disabled={busy || !form.empresa || !form.nombre || !form.email} onClick={submit} className={`${btnPrimary} w-full`}>
        {busy ? 'Creando…' : 'Crear cuenta y enviar invitación'}
      </button>
    </div>
  )
}
