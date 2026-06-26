import { AddonId, PlanId } from './types'
import { createAdminClient } from './supabase'

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
