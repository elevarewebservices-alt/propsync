import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') // YYYY-MM-DD inclusive
  const to   = searchParams.get('to')   // YYYY-MM-DD inclusive

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: all, error } = await (db.from('properties') as any)
    .select('id, tipo, disponibilidad, estado_publicacion, property_type_label, ciudad, zona, created_at, updated_at')
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const allProps = (all ?? []) as {
    id: string
    tipo: string
    disponibilidad: string
    estado_publicacion: string
    property_type_label: string | null
    ciudad: string | null
    zona: string | null
    created_at: string
    updated_at: string
  }[]

  // When a date range is given, scope the analysis to properties created in it.
  // The end bound is inclusive (whole day), so add 1 day to the `to` date.
  const fromIso = from ? new Date(from + 'T00:00:00').toISOString() : null
  const toIso = to ? new Date(new Date(to + 'T00:00:00').getTime() + 86400000).toISOString() : null
  const props = (fromIso || toIso)
    ? allProps.filter(p =>
        (!fromIso || p.created_at >= fromIso) &&
        (!toIso || p.created_at < toIso))
    : allProps

  const rangeActive = !!(fromIso || toIso)

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const total = props.length
  const disponibles = props.filter(p => p.disponibilidad === 'disponible').length
  const vendidas = props.filter(p => p.disponibilidad === 'vendido').length
  const arrendadas = props.filter(p => p.disponibilidad === 'alquilado').length
  const activas = props.filter(p => p.estado_publicacion === 'activo' || p.estado_publicacion === 'destacado').length
  const inactivas = props.filter(p => p.estado_publicacion === 'inactivo').length

  const nuevasEsteMes = props.filter(p => p.created_at >= monthStart).length
  const vendidasEsteMes = props.filter(p => p.disponibilidad === 'vendido' && p.updated_at >= monthStart).length
  const arrendadasEsteMes = props.filter(p => p.disponibilidad === 'alquilado' && p.updated_at >= monthStart).length

  // ── Distribuciones ─────────────────────────────────────────────────────────
  function countBy(arr: typeof props, key: keyof typeof props[0]) {
    const map: Record<string, number> = {}
    for (const p of arr) {
      const val = (p[key] as string) || 'Sin especificar'
      map[val] = (map[val] ?? 0) + 1
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  }

  const porTipo = [
    { label: 'Venta', value: props.filter(p => p.tipo === 'venta').length },
    { label: 'Arriendo', value: props.filter(p => p.tipo === 'arriendo').length },
  ]

  const porDisponibilidad = [
    { label: 'Disponible', value: disponibles, color: '#10b981' },
    { label: 'Vendida', value: vendidas, color: '#8b5cf6' },
    { label: 'Arrendada', value: arrendadas, color: '#f59e0b' },
  ]

  const porEstado = [
    { label: 'Activo', value: props.filter(p => p.estado_publicacion === 'activo').length, color: '#3b82f6' },
    { label: 'Destacado', value: props.filter(p => p.estado_publicacion === 'destacado').length, color: '#f59e0b' },
    { label: 'Inactivo', value: inactivas, color: '#6b7280' },
  ]

  const porTipoInmueble = countBy(props, 'property_type_label').slice(0, 8)
  const porCiudad = countBy(props, 'ciudad').slice(0, 8)
  const porZona = countBy(props, 'zona').slice(0, 10)

  // ── Monthly trend (last 6 months) ──────────────────────────────────────────
  const months: { label: string; creadas: number; vendidas: number; arrendadas: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
    const label = d.toLocaleDateString('es', { month: 'short', year: '2-digit' })
    months.push({
      label,
      creadas: allProps.filter(p => p.created_at >= start && p.created_at < end).length,
      vendidas: allProps.filter(p => p.disponibilidad === 'vendido' && p.updated_at >= start && p.updated_at < end).length,
      arrendadas: allProps.filter(p => p.disponibilidad === 'alquilado' && p.updated_at >= start && p.updated_at < end).length,
    })
  }

  return NextResponse.json({
    rangeActive,
    kpis: { total, disponibles, vendidas, arrendadas, activas, inactivas, nuevasEsteMes, vendidasEsteMes, arrendadasEsteMes },
    porTipo,
    porDisponibilidad,
    porEstado,
    porTipoInmueble,
    porCiudad,
    porZona,
    tendencia: months,
  })
}
