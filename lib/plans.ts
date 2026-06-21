import { Plan, PlanId } from './types'

export const ASSISTANT_LIMITS: Record<string, number> = {
  starter: 200,
  pro:     1000,
  agency:  5000,
}

// Extra agent add-on price (USD/month per agent, applies on Pro plan)
export const AGENT_EXTRA_PRICE = 20

export const PLANS: Plan[] = [
  {
    id: 'starter',
    nombre: 'Starter',
    precio: 49,
    limites: {
      propiedades: 50,
      agentes: 1,
      fuentes: 1,
      canales: ['facebook'],
      mantener: false,
      soporte: 'comunidad',
    },
    features: [
      'Hasta 50 propiedades',
      '1 agente',
      'Publicación en Facebook Marketplace',
      '1 fuente de datos (Wasi)',
      'Dashboard básico',
      'Cola de publicación',
      'Historial de publicaciones',
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 99,
    limites: {
      propiedades: 'ilimitado',
      agentes: 5,
      fuentes: 3,
      canales: ['facebook', 'mercadolibre', 'olx'],
      mantener: true,
      soporte: 'email',
    },
    features: [
      'Propiedades ilimitadas',
      'Hasta 5 agentes (+$20/agente adicional)',
      'Publicación en FB + MercadoLibre + OLX',
      '3 fuentes de datos',
      'Módulo Mantener completo',
      'Campaña WhatsApp automática',
      'Limpieza de base de datos',
      'Soporte por email',
    ],
  },
  {
    id: 'agency',
    nombre: 'Agency',
    precio: 199,
    limites: {
      propiedades: 'ilimitado',
      agentes: 10,
      fuentes: 'ilimitado',
      canales: ['facebook', 'mercadolibre', 'olx', 'instagram'],
      mantener: true,
      soporte: 'dedicado',
    },
    features: [
      'Propiedades ilimitadas',
      'Hasta 10 agentes',
      'Todos los canales de publicación',
      'Fuentes ilimitadas',
      'Módulo Mantener completo',
      'API de integración',
      'Pipelines múltiples',
      'Reportes avanzados',
      'Soporte dedicado 24/7',
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
  const order: PlanId[] = ['starter', 'pro', 'agency']
  return order.indexOf(userPlanId) >= order.indexOf(requiredPlanId)
}
