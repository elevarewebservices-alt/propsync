'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Crown, ShieldCheck, User, AlertCircle, Trophy } from 'lucide-react'

interface AgentStats {
  id: string
  nombre: string
  email: string
  rol: string
  auth_user_id: string | null
  created_at: string
  leadsAsignados: number
  followUpsVencidos: number
  cierresMes: number
}

const ROL_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  owner:  { label: 'Propietario', icon: Crown,       color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  admin:  { label: 'Admin',       icon: ShieldCheck, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  agente: { label: 'Agente',      icon: User,        color: 'bg-muted text-muted-foreground' },
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

export default function EquipoPage() {
  const [agents, setAgents] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/crm/equipo')
      .then((r) => r.json())
      .then((data) => { setAgents(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Cargando equipo…</div>
      </div>
    )
  }

  const topCloser = agents.reduce<AgentStats | null>(
    (best, a) => (!best || a.cierresMes > best.cierresMes ? a : best),
    null
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-sm text-muted-foreground">
            {agents.length} agente{agents.length !== 1 ? 's' : ''} activo{agents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/configuracion/usuarios">
          <Button size="sm" className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Invitar agente
          </Button>
        </Link>
      </div>

      {/* Summary row */}
      {agents.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{agents.reduce((s, a) => s + a.leadsAsignados, 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Leads totales</p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {agents.reduce((s, a) => s + a.followUpsVencidos, 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Follow-ups vencidos</p>
          </div>
          <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10 p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {agents.reduce((s, a) => s + a.cierresMes, 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Cierres este mes</p>
          </div>
        </div>
      )}

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const cfg = ROL_CONFIG[agent.rol] ?? ROL_CONFIG.agente
          const RolIcon = cfg.icon
          const isTop = topCloser?.id === agent.id && agent.cierresMes > 0
          return (
            <div
              key={agent.id}
              className="rounded-xl border border-border bg-card p-5 relative"
            >
              {isTop && (
                <div className="absolute top-3 right-3">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {initials(agent.nombre)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{agent.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                  {!agent.auth_user_id && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Invitación pendiente</p>
                  )}
                </div>
              </div>

              <Badge className={`text-xs mb-4 ${cfg.color}`}>
                <RolIcon className="h-3 w-3 mr-1" />
                {cfg.label}
              </Badge>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-foreground leading-none">{agent.leadsAsignados}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Leads</p>
                </div>
                <div
                  className={`text-center p-2 rounded-lg ${
                    agent.followUpsVencidos > 0
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : 'bg-muted/50'
                  }`}
                >
                  <p
                    className={`text-lg font-bold leading-none ${
                      agent.followUpsVencidos > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-foreground'
                    }`}
                  >
                    {agent.followUpsVencidos}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Vencidos</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-foreground leading-none">{agent.cierresMes}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Cierres</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-xl gap-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay agentes en tu equipo todavía</p>
          <Link href="/configuracion/usuarios">
            <Button size="sm" variant="outline" className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Invitar primer agente
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
