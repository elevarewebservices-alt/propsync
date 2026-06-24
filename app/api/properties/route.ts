import { NextRequest, NextResponse } from 'next/server'
import { listProperties, createProperty } from '@/lib/properties'
import { resolveCompanyId, getSessionPlan, getSessionAgent, getSessionPermissions } from '@/lib/auth'
import { getPlan } from '@/lib/plans'
import { createAdminClient } from '@/lib/supabase'
import type { PropertyInsert } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const companyId = await resolveCompanyId()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit  = searchParams.get('limit')

    // Optional lightweight search for the CRM "link property" picker
    if (search) {
      const db = createAdminClient()
      const q = `%${search}%`
      const max = Math.min(parseInt(limit ?? '20', 10) || 20, 50)
      const { data, error } = await db
        .from('properties')
        .select('id, titulo, precio, ciudad, bedrooms, main_image_url')
        .eq('company_id', companyId)
        .or(`titulo.ilike.${q},zona.ilike.${q},ciudad.ilike.${q}`)
        .limit(max)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data ?? [])
    }

    const data = await listProperties(companyId)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await resolveCompanyId()
    const planId = await getSessionPlan()
    const plan = getPlan(planId)

    // Enforce property limit
    if (plan.limites.propiedades !== 'ilimitado') {
      const db = createAdminClient()
      const { count } = await db
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      if (count !== null && count >= (plan.limites.propiedades as number)) {
        return NextResponse.json(
          {
            error: `Límite alcanzado: tu plan ${plan.nombre} permite ${plan.limites.propiedades} propiedades. Actualiza tu plan para agregar más.`,
            code: 'PLAN_LIMIT_REACHED',
          },
          { status: 403 }
        )
      }
    }

    const body = (await request.json()) as PropertyInsert

    // A restricted agente always owns what they create — never trust the
    // client to assign a property to someone else when their edit scope is
    // limited to "own", otherwise they could create it under a teammate and
    // dodge the ownership check entirely.
    const permissions = await getSessionPermissions()
    let agenteAsignadoId = body.agente_asignado_id
    if (!permissions.editAllProperties) {
      const me = await getSessionAgent()
      agenteAsignadoId = (me as any)?.id ?? null
    }

    const data = await createProperty({ ...body, company_id: companyId, agente_asignado_id: agenteAsignadoId })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
