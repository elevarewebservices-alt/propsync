'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Mail, Trash2, Crown, ShieldCheck, User } from 'lucide-react'

interface Agent {
  id: string
  nombre: string
  email: string
  telefono: string | null
  rol: string
  is_active: boolean
  auth_user_id: string | null
  created_at: string
}

const ROL_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  owner:  { label: 'Propietario', icon: Crown,        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  admin:  { label: 'Admin',       icon: ShieldCheck,  color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  agente: { label: 'Agente',      icon: User,         color: 'bg-muted text-muted-foreground' },
}

export default function UsuariosPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)

  // Invite form state
  const [invNombre, setInvNombre] = useState('')
  const [invEmail, setInvEmail]   = useState('')
  const [invRol, setInvRol]       = useState('agente')
  const [invLoading, setInvLoading] = useState(false)
  const [invError, setInvError]   = useState<string | null>(null)
  const [invDone, setInvDone]     = useState(false)

  async function load() {
    setLoading(true)
    const [agentsRes, meRes] = await Promise.all([
      fetch('/api/agents'),
      fetch('/api/auth/me'),
    ])
    if (agentsRes.ok) setAgents(await agentsRes.json())
    if (meRes.ok) {
      const me = await meRes.json()
      // get my agent id from the list — match by email
      setMyId(me.email ?? null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInvError(null)
    setInvLoading(true)

    const res = await fetch('/api/agents/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: invNombre, email: invEmail, rol: invRol }),
    })
    const body = await res.json()

    if (!res.ok) {
      setInvError(body.error ?? 'Error al enviar invitación.')
      setInvLoading(false)
      return
    }

    setInvDone(true)
    setInvLoading(false)
    load()
  }

  function closeInvite() {
    setInviteOpen(false)
    setInvNombre('')
    setInvEmail('')
    setInvRol('agente')
    setInvError(null)
    setInvDone(false)
  }

  async function handleDeactivate(agent: Agent) {
    if (!confirm(`¿Desactivar a ${agent.nombre}? Perderá acceso a PropSync.`)) return
    await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' })
    load()
  }

  const active  = agents.filter((a) => a.is_active)
  const pending = agents.filter((a) => !a.is_active)

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona los agentes de tu empresa
          </p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invitar agente
        </Button>
      </div>

      {/* Active agents */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-semibold text-foreground">
            Agentes activos <span className="text-muted-foreground font-normal">({active.length})</span>
          </p>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : active.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Sin agentes activos</div>
        ) : (
          <div className="divide-y divide-border">
            {active.map((agent) => {
              const meta = ROL_LABELS[agent.rol] ?? ROL_LABELS.agente
              const Icon = meta.icon
              const isMe = agent.email === myId
              return (
                <div key={agent.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {agent.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {agent.nombre} {isMe && <span className="text-xs text-muted-foreground">(tú)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  {!isMe && agent.rol !== 'owner' && (
                    <button
                      onClick={() => handleDeactivate(agent)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded"
                      title="Desactivar agente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Invitaciones pendientes <span className="text-muted-foreground font-normal">({pending.length})</span>
            </p>
          </div>
          <div className="divide-y divide-border">
            {pending.map((agent) => (
              <div key={agent.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{agent.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                </div>
                <Badge variant="secondary" className="text-xs">Pendiente</Badge>
                <button
                  onClick={() => handleDeactivate(agent)}
                  className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded"
                  title="Cancelar invitación"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!o) closeInvite() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar agente</DialogTitle>
          </DialogHeader>

          {invDone ? (
            <div className="py-4 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-foreground">Invitación enviada</p>
              <p className="text-sm text-muted-foreground">
                Le enviamos un correo a <strong>{invEmail}</strong> con el enlace para unirse.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4 pt-2">
              {invError && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 px-3 py-2 rounded-md">
                  {invError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Nombre completo</Label>
                <Input
                  required
                  value={invNombre}
                  onChange={(e) => setInvNombre(e.target.value)}
                  placeholder="Ana García"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Correo electrónico</Label>
                <Input
                  type="email"
                  required
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="ana@tuagencia.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={invRol} onValueChange={(v) => setInvRol(v ?? 'agente')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agente">Agente — puede gestionar propiedades y CRM</SelectItem>
                    <SelectItem value="admin">Admin — puede invitar otros agentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={closeInvite}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={invLoading}>
                  {invLoading ? 'Enviando...' : 'Enviar invitación'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {invDone && (
            <DialogFooter>
              <Button onClick={closeInvite} className="bg-blue-600 hover:bg-blue-700 text-white">
                Listo
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
