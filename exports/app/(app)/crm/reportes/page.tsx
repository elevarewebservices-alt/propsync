'use client'

import { useState, useEffect } from 'react'
import { Contact, CrmStage } from '@/lib/types'
import { TrendingUp, Users, Target, Clock, Home, CheckCircle, Key, PlusCircle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Shared components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: 'blue' | 'green' | 'purple' | 'amber' | 'red'
}) {
  const styles = {
    blue:   'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    amber:  'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    red:    'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${styles[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function BarChart({ data, max }: { data: { label: string; value: number; color?: string }[]; max: number }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
  return (
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-32 truncate shrink-0">{item.label}</span>
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: max > 0 ? `${(item.value / max) * 100}%` : '0%', backgroundColor: item.color ?? '#3b82f6' }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground w-8 text-right shrink-0">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function TrendChart({ data }: { data: { label: string; creadas: number; vendidas: number; arrendadas: number }[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.creadas, d.vendidas, d.arrendadas]), 1)
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Creadas</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Vendidas</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Arrendadas</span>
      </div>
      <div className="flex items-end gap-2 h-32">
        {data.map((m) => (
          <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-0.5 h-24 justify-center">
              {[
                { v: m.creadas, c: 'bg-blue-500' },
                { v: m.vendidas, c: 'bg-purple-500' },
                { v: m.arrendadas, c: 'bg-amber-500' },
              ].map(({ v, c }, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${c} transition-all duration-500 min-h-[2px]`}
                  style={{ height: `${(v / maxVal) * 100}%` }}
                  title={String(v)}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CRM tab ────────────────────────────────────────────────────────────────────

function CrmTab() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stages, setStages] = useState<CrmStage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/crm/contacts?limit=2000').then(r => r.json()),
      fetch('/api/crm/stages').then(r => r.json()),
    ]).then(([cd, sd]) => {
      setContacts(cd.contacts ?? [])
      setStages(sd)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-sm text-muted-foreground text-center py-16">Cargando…</p>

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const total = contacts.length

  const terminalSlugs = new Set(stages.filter(s => s.is_terminal && s.slug !== 'descartado' && s.slug !== 'basurero').map(s => s.slug))
  const cerrados = contacts.filter(c => terminalSlugs.has(c.etapa_crm))
  const cerradosEsteMes = cerrados.filter(c => c.updated_at >= monthStart)
  const tasaConversion = total > 0 ? Math.round((cerrados.length / total) * 100) : 0
  const metaContacts = contacts.filter(c => c.fuente === 'meta_leads')
  const tiktokContacts = contacts.filter(c => c.tags?.includes('tiktok'))
  const nuevosMes = contacts.filter(c => c.created_at >= monthStart).length

  const fuenteMap: Record<string, number> = {}
  for (const c of contacts) fuenteMap[c.fuente] = (fuenteMap[c.fuente] ?? 0) + 1
  const fuenteData = Object.entries(fuenteMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))

  const etapaData = stages.map(s => ({
    label: s.nombre,
    value: contacts.filter(c => c.etapa_crm === s.slug).length,
    color: s.color,
  }))

  const agenteMap: Record<string, number> = {}
  for (const c of contacts) {
    if (c.agente_nombre) agenteMap[c.agente_nombre] = (agenteMap[c.agente_nombre] ?? 0) + 1
  }
  const agenteData = Object.entries(agenteMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }))

  const metaMap: Record<string, number> = {}
  for (const c of metaContacts) {
    const key = c.meta_campaign ?? 'Sin nombre'
    metaMap[key] = (metaMap[key] ?? 0) + 1
  }
  const metaData = Object.entries(metaMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }))

  const maxEtapa  = Math.max(...etapaData.map(d => d.value), 1)
  const maxFuente = Math.max(...fuenteData.map(d => d.value), 1)
  const maxAgente = Math.max(...agenteData.map(d => d.value), 1)
  const maxMeta   = Math.max(...metaData.map(d => d.value), 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}     label="Total leads"          value={total}                color="blue"   />
        <StatCard icon={PlusCircle} label="Nuevos este mes"     value={nuevosMes}            color="green"  sub={`${total} total histórico`} />
        <StatCard icon={Target}    label="Cerrados este mes"    value={cerradosEsteMes.length} color="purple" sub={`${cerrados.length} total`} />
        <StatCard icon={TrendingUp} label="Tasa de conversión"  value={`${tasaConversion}%`} color="amber"  sub="total histórico" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock}  label="Leads Meta Ads"  value={metaContacts.length}  color="blue"   sub={`${total > 0 ? Math.round((metaContacts.length/total)*100) : 0}% del total`} />
        <StatCard icon={Clock}  label="Leads TikTok"    value={tiktokContacts.length} color="purple" sub={`${total > 0 ? Math.round((tiktokContacts.length/total)*100) : 0}% del total`} />
        <StatCard icon={Target} label="En pipeline activo" value={contacts.filter(c => !terminalSlugs.has(c.etapa_crm)).length} color="green" />
        <StatCard icon={Users}  label="Con seguimiento vencido" value={contacts.filter(c => c.fecha_seguimiento && c.fecha_seguimiento < new Date().toISOString().slice(0,10)).length} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Leads por etapa</h2>
          <BarChart data={etapaData} max={maxEtapa} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Leads por fuente</h2>
          <BarChart data={fuenteData} max={maxFuente} />
        </div>
        {agenteData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">Top agentes (leads asignados)</h2>
            <BarChart data={agenteData} max={maxAgente} />
          </div>
        )}
        {metaData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">Campañas Meta (top 5)</h2>
            <BarChart data={metaData} max={maxMeta} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Properties tab ─────────────────────────────────────────────────────────────

interface PropStats {
  kpis: {
    total: number; disponibles: number; vendidas: number; arrendadas: number
    activas: number; inactivas: number
    nuevasEsteMes: number; vendidasEsteMes: number; arrendadasEsteMes: number
  }
  porTipo: { label: string; value: number }[]
  porDisponibilidad: { label: string; value: number; color: string }[]
  porEstado: { label: string; value: number; color: string }[]
  porTipoInmueble: { label: string; value: number }[]
  porCiudad: { label: string; value: number }[]
  porZona: { label: string; value: number }[]
  tendencia: { label: string; creadas: number; vendidas: number; arrendadas: number }[]
}

function PropiedadesTab() {
  const [stats, setStats] = useState<PropStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/properties/stats').then(r => r.json()).then(d => {
      setStats(d)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-sm text-muted-foreground text-center py-16">Cargando…</p>
  if (!stats) return null

  const { kpis } = stats

  return (
    <div className="space-y-6">
      {/* KPIs — inventario total */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Home}        label="Total en inventario"  value={kpis.total}       color="blue"   />
        <StatCard icon={CheckCircle} label="Disponibles"          value={kpis.disponibles} color="green"  sub={`${kpis.total > 0 ? Math.round((kpis.disponibles/kpis.total)*100) : 0}% del inventario`} />
        <StatCard icon={TrendingUp}  label="Vendidas (histórico)" value={kpis.vendidas}    color="purple" />
        <StatCard icon={Key}         label="Arrendadas (histórico)" value={kpis.arrendadas} color="amber" />
      </div>

      {/* KPIs — actividad del mes */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Actividad este mes</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={PlusCircle}  label="Nuevas propiedades"  value={kpis.nuevasEsteMes}    color="blue"   />
          <StatCard icon={TrendingUp}  label="Marcadas vendidas"   value={kpis.vendidasEsteMes}  color="purple" />
          <StatCard icon={Key}         label="Marcadas arrendadas" value={kpis.arrendadasEsteMes} color="amber" />
          <StatCard icon={Home}        label="Activas / Publicadas" value={kpis.activas}          color="green"  sub={`${kpis.inactivas} inactivas`} />
        </div>
      </div>

      {/* Tendencia últimos 6 meses */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Tendencia últimos 6 meses</h2>
        <TrendChart data={stats.tendencia} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipo de negocio */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Venta vs Arriendo</h2>
          <BarChart
            data={stats.porTipo.map((d, i) => ({ ...d, color: i === 0 ? '#3b82f6' : '#f59e0b' }))}
            max={Math.max(...stats.porTipo.map(d => d.value), 1)}
          />
        </div>

        {/* Disponibilidad */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Por disponibilidad</h2>
          <BarChart data={stats.porDisponibilidad} max={Math.max(...stats.porDisponibilidad.map(d => d.value), 1)} />
        </div>

        {/* Estado de publicación */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Por estado de publicación</h2>
          <BarChart data={stats.porEstado} max={Math.max(...stats.porEstado.map(d => d.value), 1)} />
        </div>

        {/* Tipo de inmueble */}
        {stats.porTipoInmueble.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">Por tipo de inmueble</h2>
            <BarChart data={stats.porTipoInmueble} max={Math.max(...stats.porTipoInmueble.map(d => d.value), 1)} />
          </div>
        )}

        {/* Por ciudad */}
        {stats.porCiudad.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">Por ciudad (top 8)</h2>
            <BarChart data={stats.porCiudad} max={Math.max(...stats.porCiudad.map(d => d.value), 1)} />
          </div>
        )}

        {/* Por zona */}
        {stats.porZona.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">Por zona (top 10)</h2>
            <BarChart data={stats.porZona} max={Math.max(...stats.porZona.map(d => d.value), 1)} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [tab, setTab] = useState<'crm' | 'propiedades'>('crm')

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reportes y estadísticas</h1>
        <p className="text-sm text-muted-foreground">Análisis de rendimiento del CRM e inventario de propiedades</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'crm' | 'propiedades')}>
        <TabsList>
          <TabsTrigger value="crm">CRM / Leads</TabsTrigger>
          <TabsTrigger value="propiedades">Propiedades</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'crm' ? <CrmTab /> : <PropiedadesTab />}
    </div>
  )
}
