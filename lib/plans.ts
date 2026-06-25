import { Plan, PlanId } from './types'
import { CANALES_PUBLICACION } from './canales'

const TODOS_LOS_CANALES = CANALES_PUBLICACION.map((c) => c.id)

export const ASSISTANT_LIMITS: Record<string, number> = {
  starter: 200,
  pro:     1000,
}

// Extra agent add-on price (USD/month per agent, applies on Pro plan)
export const AGENT_EXTRA_PRICE = 7.99

export const PLANS: Plan[] = [
  {
    id: 'starter',
    nombre: 'Individual',
    precio: 30,
    limites: {
      propiedades: 50,
      agentes: 1,
      fuentes: 1,
      canales: TODOS_LOS_CANALES,
      mantener: false,
      soporte: 'comunidad',
      api: false,
    },
    features: [
      'Hasta 50 propiedades',
      '1 usuario',
      'Conexión a portales (Compre o Alquile, Encuentra24, Página web)',
      '1 fuente de datos (Wasi)',
      'Dashboard básico',
      'Cola de publicación',
      'Historial de publicaciones',
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 60,
    limites: {
      propiedades: 'ilimitado',
      agentes: 2,
      fuentes: 3,
      canales: TODOS_LOS_CANALES,
      mantener: true,
      soporte: 'email',
      api: true,
    },
    features: [
      'Propiedades ilimitadas',
      '2 usuarios (+$7.99/usuario adicional)',
      'Conexión a portales (Compre o Alquile, Encuentra24, Página web)',
      '3 fuentes de datos',
      'Módulo Mantener completo',
      'Campaña WhatsApp automática',
      'Limpieza de base de datos',
      'API de integración',
      'Soporte por email',
    ],
  },
]

export function getPlan(planId: PlanId): Plan {
  return PLANS.find((p) => p.id === planId) ?? PLANS[0]
}

export function canAccess(userPlanId: PlanId, feature: keyof Plan['limites']): boolean {
  const plan = getPlan(userPlanId)
  const value = plan.limites[feature]
  if (typeof value === 'boolean') return value
  if (value === 'ilimitado') return true
  return (value as number) > 0
}

export function canAccessChannel(userPlanId: PlanId, canal: string): boolean {
  const plan = getPlan(userPlanId)
  return plan.limites.canales.includes(canal)
}

export function requiresPlan(userPlanId: PlanId, requiredPlanId: PlanId): boolean {
  const order: PlanId[] = ['starter', 'pro']
  return order.indexOf(userPlanId) >= order.indexOf(requiredPlanId)
}
