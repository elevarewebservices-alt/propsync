import { AddonId, PlanId } from './types'
import { createAdminClient } from './supabase'
import { resolveCompanyId, getSessionPlan, getSessionPermissions } from './auth'

export interface Addon {
  id: AddonId
  nombre: string
  precio: number
  requiresPlan: PlanId
  descripcion: string
  features: string[]
}

// WhatsApp message costs are NOT included — those are billed directly to the
// client by Meta/their BSP. This add-on only covers the platform features
// (template management, qualification flow, shared inbox, bulk email).
export const ADDONS: Addon[] = [
  {
    id: 'marketing',
    nombre: 'Marketing',
    precio: 40,
    requiresPlan: 'pro',
    descripcion: 'Gestión de templates de WhatsApp, respuesta automática a leads y email marketing masivo.',
    features: [
      'Gestión de templates de WhatsApp (Meta)',
      'Flujo de calificación automática de leads',
      'Inbox compartido de WhatsApp',
      'Email marketing masivo',
    ],
  },
]

export function getAddon(addonId: AddonId): Addon | undefined {
  return ADDONS.find((a) => a.id === addonId)
}

export async function hasAddon(companyId: string, addonId: AddonId): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await (db.from('company_addons') as any)
    .select('activo')
    .eq('company_id', companyId)
    .eq('addon_id', addonId)
    .eq('activo', true)
    .maybeSingle()

  return !!data
}

export type AddonGuardResult =
  | { ok: true; companyId: string }
  | { ok: false; status: number; error: string }

/**
 * Single source of truth for server-side add-on gating. Both the templates
 * route and its [name] sub-route call this so the enforcement can't drift.
 * Fails closed at every step (unauth → 401, no settings perm → 403, wrong
 * plan or missing add-on → 403). An add-on is ONLY accessible when the
 * company is on the required plan AND has an active company_addons row — and
 * that row can only ever be written server-side (RLS denies client writes).
 */
export async function requireAddon(addonId: AddonId): Promise<AddonGuardResult> {
  const addon = getAddon(addonId)
  if (!addon) return { ok: false, status: 403, error: 'Add-on no disponible' }

  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  if (!(await getSessionPermissions()).accessSettings) {
    return { ok: false, status: 403, error: 'Sin permisos' }
  }

  const plan = await getSessionPlan()
  if (!requiresPlanGte(plan, addon.requiresPlan) || !(await hasAddon(companyId, addonId))) {
    return {
      ok: false,
      status: 403,
      error: `Esto requiere el add-on ${addon.nombre} (plan Pro + ${addon.nombre})`,
    }
  }

  return { ok: true, companyId }
}

// Local plan-order check so addons.ts stays self-contained (mirrors plans.ts's
// requiresPlan without importing it).
function requiresPlanGte(userPlan: PlanId, required: PlanId): boolean {
  const order: PlanId[] = ['starter', 'pro']
  return order.indexOf(userPlan) >= order.indexOf(required)
}
