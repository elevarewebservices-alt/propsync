'use client'

import { useEffect, useState } from 'react'
import { resolvePermissions, type AgentPermissions } from '@/lib/permissions'

interface SessionPermissionsState {
  permissions: AgentPermissions
  rol: string | null
  loading: boolean
}

const DEFAULT_PERMISSIONS = resolvePermissions('agente')

// Fetches the current agent's effective permissions once per mount. Used by
// the Sidebar and any Configuración page that's restricted beyond "General".
export function useSessionPermissions(): SessionPermissionsState {
  const [state, setState] = useState<SessionPermissionsState>({
    permissions: DEFAULT_PERMISSIONS,
    rol: null,
    loading: true,
  })

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setState({
          permissions: d.permissions ?? DEFAULT_PERMISSIONS,
          rol: d.rol ?? null,
          loading: false,
        })
      })
      .catch(() => setState((s) => ({ ...s, loading: false })))
  }, [])

  return state
}
