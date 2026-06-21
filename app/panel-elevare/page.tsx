import { notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { isPlatformAdmin, EST_COST_PER_REQUEST } from '@/lib/platform-admin'
import { ASSISTANT_LIMITS } from '@/lib/plans'

export const dynamic = 'force-dynamic'

interface CompanyRow {
  id: string
  nombre: string
  email: string | null
  plan_id: string
  created_at: string
  propiedades: number
  contactos: number
  agentes: number
  iaMes: number
}

async function loadData() {
  const db = createAdminClient()
  const month = new Date().toISOString().slice(0, 7) // YYYY-MM

  const [companiesRes, propsRes, contactsRes, agentsRes, usageRes] = await Promise.all([
    (db.from('companies') as any).select('id, nombre, email, plan_id, created_at').order('created_at', { ascending: true }),
    (db.from('properties') as any).select('company_id'),
    (db.from('contacts') as any).select('company_id').eq('is_active', true),
    (db.from('agents') as any).select('company_id').eq('is_active', true),
    (db.from('assistant_usage') as any).select('company_id, request_count').eq('month', month),
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

  const companies: CompanyRow[] = ((companiesRes.data ?? []) as any[]).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    email: c.email,
    plan_id: c.plan_id,
    created_at: c.created_at,
    propiedades: propMap[c.id] ?? 0,
    contactos: contactMap[c.id] ?? 0,
    agentes: agentMap[c.id] ?? 0,
    iaMes: iaMap[c.id] ?? 0,
  }))

  const totals = {
    empresas: companies.length,
    propiedades: companies.reduce((s, c) => s + c.propiedades, 0),
    contactos: companies.reduce((s, c) => s + c.contactos, 0),
    agentes: companies.reduce((s, c) => s + c.agentes, 0),
    iaMes: companies.reduce((s, c) => s + c.iaMes, 0),
  }
  return { companies, totals, month }
}

export default async function PanelElevarePage() {
  // ── Gate: only platform admins (Elevare). 404 to anyone else. ──
  const user = await getSessionUser()
  if (!isPlatformAdmin(user?.email)) notFound()

  const { companies, totals, month } = await loadData()
  const costMes = totals.iaMes * EST_COST_PER_REQUEST

  const planBadge = (p: string) =>
    p === 'agency' ? 'bg-violet-100 text-violet-700' :
    p === 'pro'    ? 'bg-blue-100 text-blue-700' :
                     'bg-gray-100 text-gray-700'

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

        <div className="rounded-xl border bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Costo IA estimado este mes</p>
            <p className="text-xs text-gray-500">{totals.iaMes.toLocaleString()} consultas × ${EST_COST_PER_REQUEST} (aprox. Haiku + caching)</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${costMes.toFixed(2)}</p>
        </div>

        {/* Companies table */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b"><h2 className="text-sm font-semibold">Empresas</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5">Empresa</th>
                  <th className="text-left px-4 py-2.5">Plan</th>
                  <th className="text-right px-4 py-2.5">Propiedades</th>
                  <th className="text-right px-4 py-2.5">Contactos</th>
                  <th className="text-right px-4 py-2.5">Agentes</th>
                  <th className="text-right px-4 py-2.5">IA mes</th>
                  <th className="text-right px-4 py-2.5">Límite IA</th>
                  <th className="text-left px-4 py-2.5">Registrada</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {companies.map((c) => {
                  const limit = ASSISTANT_LIMITS[c.plan_id] ?? ASSISTANT_LIMITS.starter
                  const near = c.iaMes / limit >= 0.8
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{c.nombre}</div>
                        <div className="text-xs text-gray-400">{c.email ?? '—'}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadge(c.plan_id)}`}>{c.plan_id}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">{c.propiedades}</td>
                      <td className="px-4 py-2.5 text-right">{c.contactos}</td>
                      <td className="px-4 py-2.5 text-right">{c.agentes}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${near ? 'text-amber-600' : ''}`}>{c.iaMes}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{limit.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
                {companies.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin empresas todavía.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Acceso restringido a Elevare. El costo de IA es estimado; el gasto real exacto está en console.anthropic.com.
        </p>
      </main>
    </div>
  )
}
