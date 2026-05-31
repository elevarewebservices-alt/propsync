'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play, Square, MessageCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react'

interface CampaignStats {
  total: number
  enviados: number
  respondidos: number
  pendientes: number
  enProgreso: boolean
  ultimaEjecucion: string | null
}

const EMPTY_STATS: CampaignStats = {
  total: 0,
  enviados: 0,
  respondidos: 0,
  pendientes: 0,
  enProgreso: false,
  ultimaEjecucion: null,
}

export function WhatsAppCampaignCard() {
  const [stats, setStats] = useState<CampaignStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    try {
      const res = await fetch('/api/whatsapp/campaign')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats ?? EMPTY_STATS)
      }
    } catch (err) {
      console.error('Error loading campaign stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()

    // Poll cada 5 segundos cuando hay campaña activa
    const interval = setInterval(() => {
      if (stats.enProgreso) loadStats()
    }, 5000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.enProgreso])

  const pct = stats.total > 0 ? Math.round((stats.enviados / stats.total) * 100) : 0

  const toggleCampaign = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const action = stats.enProgreso ? 'stop' : 'start'
      const res = await fetch('/api/whatsapp/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al actualizar campaña')
      } else {
        await loadStats()
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Campaña WhatsApp</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verificación automática de disponibilidad
          </p>
        </div>
        <Badge
          className={stats.enProgreso
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-muted text-muted-foreground'}
        >
          {stats.enProgreso ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total', value: stats.total, icon: MessageCircle, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Enviados', value: stats.enviados, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
              { label: 'Respondidos', value: stats.respondidos, icon: MessageCircle, color: 'text-purple-600 dark:text-purple-400' },
              { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex flex-col gap-1 rounded-lg border border-border bg-background/50 p-3">
                <Icon className={`h-4 w-4 ${color}`} />
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progreso de campaña</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>

          {stats.ultimaEjecucion && (
            <p className="mt-3 text-xs text-muted-foreground">
              Última ejecución:{' '}
              {new Date(stats.ultimaEjecucion).toLocaleString('es-PA', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}

          {error && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="mt-5 flex gap-3">
            <Button
              className={stats.enProgreso
                ? 'bg-red-600 hover:bg-red-700 text-white gap-2'
                : 'bg-blue-600 hover:bg-blue-700 text-white gap-2'}
              onClick={toggleCampaign}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : stats.enProgreso ? (
                <><Square className="h-4 w-4" /> Detener campaña</>
              ) : (
                <><Play className="h-4 w-4" /> Iniciar campaña</>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
