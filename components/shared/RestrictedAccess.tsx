import { Lock } from 'lucide-react'
import { EmptyState } from './EmptyState'

export function RestrictedAccess() {
  return (
    <div className="p-4 md:p-6">
      <EmptyState
        icon={Lock}
        title="No tienes acceso a esta sección"
        description="Esta página está reservada para administradores y el propietario de la cuenta. Si la necesitas, pídele a un admin que te dé acceso desde Configuración → Usuarios."
      />
    </div>
  )
}
