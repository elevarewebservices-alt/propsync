import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'
import type { EstadoPublicacion, Disponibilidad } from '@/lib/types'

export interface RecentProperty {
  id: string
  titulo: string
  precio: number
  tipo: 'venta' | 'arriendo'
  ciudad: string | null
  zona: string | null
  estado_publicacion: EstadoPublicacion
  disponibilidad: Disponibilidad
  main_image_url: string | null
}

export interface DashboardData {
  totalPropiedades: number
  propiedadesActivas: number
  propiedadesDisponibles: number
  nuevosLeads: number
  followUpsPendientes: number
  cerradosMes: number
  recentProperties: RecentProperty[]
  whatsapp: {
    enviadosMes: number
    respondidosMes: number
    propiedadesVerificadas: number
    campanaActiva: boolean
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    totalProps,
    activasProps,
    disponiblesProps,
    nuevosLeads,
    followUps,
    cerradosMes,
    recentProps,
  ] = await Promise.all([
    db.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    db.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).in('estado_publicacion', ['activo', 'destacado']),
    db.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('disponibilidad', 'disponible'),
    (db.from('contacts') as any).select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).gte('created_at', weekAgo),
    (db.from('contacts') as any).select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).lte('fecha_seguimiento', today).not('fecha_seguimiento', 'is', null),
    (db.from('contacts') as any).select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('etapa_crm', 'cerrado').gte('updated_at', monthStart),
    db.from('properties').select('id, titulo, precio, tipo, ciudad, zona, estado_publicacion, disponibilidad, main_image_url, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
  ])

  // WhatsApp tables only exist once WhatsApp is configured — query safely
  let waStats = { enviadosMes: 0, respondidosMes: 0, propiedadesVerificadas: 0, campanaActiva: false }
  try {
    const [waSent, waReceived, waVerified, activeCampaign] = await Promise.all([
      (db.from('whatsapp_messages') as any).select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('direction', 'outbound').gte('created_at', monthStart),
      (db.from('whatsapp_messages') as any).select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('direction', 'inbound').gte('created_at', monthStart),
      (db.from('properties') as any).select('*', { count: 'exact', head: true }).eq('company_id', companyId).in('whatsapp_estado', ['disponible', 'vendida', 'no_disponible']),
      (db.from('whatsapp_campaigns') as any).select('id').eq('company_id', companyId).eq('status', 'activa').limit(1),
    ])
    if (!waSent.error) {
      waStats = {
        enviadosMes: waSent.count ?? 0,
        respondidosMes: waReceived.count ?? 0,
        propiedadesVerificadas: waVerified.count ?? 0,
        campanaActiva: (activeCampaign.data?.length ?? 0) > 0,
      }
    }
  } catch { /* WhatsApp not configured yet */ }

  return {
    totalPropiedades: totalProps.count ?? 0,
    propiedadesActivas: activasProps.count ?? 0,
    propiedadesDisponibles: disponiblesProps.count ?? 0,
    nuevosLeads: nuevosLeads.count ?? 0,
    followUpsPendientes: followUps.count ?? 0,
    cerradosMes: cerradosMes.count ?? 0,
    recentProperties: (recentProps.data as RecentProperty[]) ?? [],
    whatsapp: waStats,
  }
}
