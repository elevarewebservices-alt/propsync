import { notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { isPlatformAdmin, EST_COST_PER_REQUEST, estStorageGB, R2_STORAGE_PER_GB } from '@/lib/platform-admin'
import { ASSISTANT_LIMITS } from '@/lib/plans'
import { AdminPanel } from './AdminPanel'
import { ADDONS } from '@/lib/addons'
import type { CompanyRow, PaymentRow, PromoRow } from './types'

export const dynamic = 'force-dynamic'

async function loadData() {
  const db = createAdminClient()
  const month = new Date().toISOString().slice(0, 7) // YYYY-MM

  const [companiesRes, propsRes, contactsRes, agentsRes, usageRes, imgRes, addonsRes, paymentsRes, promosRes, feedsRes] = await Promise.all([
    (db.from('companies') as any)
      .select('id, nombre, email, plan_id, created_at, subscription_status, subscription_provider, trial_ends_at, current_period_end')
      .order('created_at', { ascending: true }),
    (db.from('properties') as any).select('company_id'),
    (db.from('contacts') as any).select('company_id').eq('is_active', true),
    (db.from('agents') as any).select('company_id').eq('is_active', true),
    (db.from('assistant_usage') as any).select('company_id, request_count').eq('month', month),
    // Image counts computed in the DB (scales to 100k+ properties).
    // Falls back to empty if the migration hasn't been run yet.
    (db as any).rpc('company_image_stats').then((r: any) => r, () => ({ data: null })),
    (db.from('company_addons') as any).select('company_id, addon_id').eq('activo', true),
    // manual_payments needs migration 030 — degrade to empty if not run yet.
    (db.from('manual_payments') as any)
      .select('id, company_id, amount, method, reference, period_start, period_end, notes, created_by_email, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .then((r: any) => r, () => ({ data: null })),
    (db.from('promo_codes') as any).select('*').order('created_at', { ascending: false }),
    // feed_token needs migration 031 — queried separately so a missing column
    // only hides the feed section instead of breaking the whole panel.
    (db.from('companies') as any).select('id, feed_token, feed_last_access').then((r: any) => r, () => ({ data: null })),
  ])

  const tally = (rows: { company_id: string }[] | null) => {
    const m: Record<string, number> = {}
    for (const r of rows ?? []) m[r.company_id] = (m[r.company_id] ?? 0) + 1
    return m
  }
  const propMap = tally(propsRes.data)
  const contactMap = tally(contactsRes.data)
  const agentMap = tally(agentsRes.data)
  const iaMap: Record<string, number> = {}
  for (const u of (usageRes.data ?? []) as { company_id: string; request_count: number }[]) {
    iaMap[u.company_id] = u.request_count
  }
  const imgMap: Record<string, number> = {}
  for (const s of (imgRes?.data ?? []) as { company_id: string; image_count: number }[]) {
    imgMap[s.company_id] = Number(s.image_count)
  }

  const addonMap: Record<string, string[]> = {}
  for (const a of (addonsRes.data ?? []) as { company_id: string; addon_id: string }[]) {
    ;(addonMap[a.company_id] ??= []).push(a.addon_id)
  }

  const feedMap: Record<string, { feed_token: string | null; feed_last_access: Record<string, string> }> = {}
  for (const f of (feedsRes?.data ?? []) as { id: string; feed_token: string | null; feed_last_access: Record<string, string> | null }[]) {
    feedMap[f.id] = { feed_token: f.feed_token, feed_last_access: f.feed_last_access ?? {} }
  }

  const companies: CompanyRow[] = ((companiesRes.data ?? []) as any[]).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    email: c.email,
    plan_id: c.plan_id,
    created_at: c.created_at,
    subscription_status: c.subscription_status ?? null,
    subscription_provider: c.subscription_provider ?? null,
    trial_ends_at: c.trial_ends_at ?? null,
    current_period_end: c.current_period_end ?? null,
    addons: addonMap[c.id] ?? [],
    feed_token: feedMap[c.id]?.feed_token ?? null,
    feed_last_access: feedMap[c.id]?.feed_last_access ?? {},
    propiedades: propMap[c.id] ?? 0,
    contactos: contactMap[c.id] ?? 0,
    agentes: agentMap[c.id] ?? 0,
    iaMes: iaMap[c.id] ?? 0,
    imagenes: imgMap[c.id] ?? 0,
  }))

  const totals = {
    empresas: companies.length,
    propiedades: companies.reduce((s, c) => s + c.propiedades, 0),
    contactos: companies.reduce((s, c) => s + c.contactos, 0),
    agentes: companies.reduce((s, c) => s + c.agentes, 0),
    iaMes: companies.reduce((s, c) => s + c.iaMes, 0),
    imagenes: companies.reduce((s, c) => s + c.imagenes, 0),
  }
  const payments = ((paymentsRes?.data ?? []) as PaymentRow[])
  const promoCodes = ((promosRes.data ?? []) as PromoRow[])
  const paymentsTableReady = paymentsRes?.data !== null && !paymentsRes?.error
  return { companies, totals, month, payments, promoCodes, paymentsTableReady }
}

export default async function PanelElevarePage() {
  // ── Gate: only platform admins (Elevare). 404 to anyone else. ──
  const user = await getSessionUser()
  if (!isPlatformAdmin(user?.email)) notFound()

  const { companies, totals, month, payments, promoCodes, paymentsTableReady } = await loadData()
  const costMes = totals.iaMes * EST_COST_PER_REQUEST
  const totalStorageGB = estStorageGB(totals.imagenes)
  const storageCost = totalStorageGB * R2_STORAGE_PER_GB
  const fmtGB = (gb: number) => gb >= 1 ? `${gb.toFixed(2)} GB` : `${(gb * 1024).toFixed(0)} MB`

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Elevare · Panel de control</h1>
            <p className="text-xs text-gray-500">Monitor de PropSync — todas las empresas · {month}</p>
          </div>
          <span className="text-xs text-gray-400">{user?.email}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Empresas', value: totals.empresas },
            { label: 'Propiedades', value: totals.propiedades },
            { label: 'Contactos', value: totals.contactos },
            { label: 'Agentes', value: totals.agentes },
            { label: 'Consultas IA (mes)', value: totals.iaMes },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border bg-white p-4">
              <p className="text-2xl font-bold">{k.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Costo IA estimado (mes)</p>
              <p className="text-xs text-gray-500">{totals.iaMes.toLocaleString()} consultas × ${EST_COST_PER_REQUEST} · Haiku + caching</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">${costMes.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Costo R2 estimado (mes)</p>
              <p className="text-xs text-gray-500">{totals.imagenes.toLocaleString()} imágenes · {fmtGB(totalStorageGB)} · sin egress</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">${storageCost.toFixed(2)}</p>
          </div>
        </div>

        <AdminPanel
          companies={companies}
          payments={payments}
          promoCodes={promoCodes}
          paymentsTableReady={paymentsTableReady}
          assistantLimits={ASSISTANT_LIMITS}
          addons={ADDONS.map((a) => ({ id: a.id, nombre: a.nombre, requiresPlan: a.requiresPlan }))}
        />

        <p className="text-xs text-gray-400">
          Acceso restringido a Elevare. El costo de IA es estimado; el gasto real exacto está en console.anthropic.com.
        </p>
      </main>
    </div>
  )
}
