import { NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
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
    // Total properties
    db.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    // Active/published
    db.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).in('estado_publicacion', ['activo', 'destacado']),
    // Available (not sold/rented)
    db.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('disponibilidad', 'disponible'),
    // New leads this week (CRM contacts)
    (db.from('contacts') as any).select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).gte('created_at', weekAgo),
    // Follow-ups due today or overdue
    (db.from('contacts') as any).select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).lte('fecha_seguimiento', today).not('fecha_seguimiento', 'is', null),
    // Closed deals this month
    (db.from('contacts') as any).select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('etapa_crm', 'cerrado').gte('updated_at', monthStart),
    // 5 most recent properties with key fields
    db.from('properties').select('id, titulo, precio, tipo, ciudad, zona, estado_publicacion, disponibilidad, main_image_url, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
  ])

  return NextResponse.json({
    totalPropiedades: totalProps.count ?? 0,
    propiedadesActivas: activasProps.count ?? 0,
    propiedadesDisponibles: disponiblesProps.count ?? 0,
    nuevosLeads: nuevosLeads.count ?? 0,
    followUpsPendientes: followUps.count ?? 0,
    cerradosMes: cerradosMes.count ?? 0,
    recentProperties: recentProps.data ?? [],
  })
}
