import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId, getSessionPlan, getSessionAgent, getSessionPermissions } from '@/lib/auth'
import { getPlan } from '@/lib/plans'
import {
  ImportRow,
  firstValue,
  parseBool,
  parseIntOrNull,
  parseOperacion,
  parsePrice,
} from '@/lib/property-import'

export const dynamic = 'force-dynamic'

/** Hard ceiling per request — keeps one giant feed from timing out the route. */
const MAX_ROWS = 500

interface RowResult {
  row: number
  titulo: string
  status: 'imported' | 'skipped' | 'error'
  reason?: string
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await resolveCompanyId()

    // Importing is a bulk create — hold it to the same bar as creating a
    // property by hand, otherwise the XML route is a way around the scope rule.
    const permissions = await getSessionPermissions()
    const me = await getSessionAgent()
    const agenteAsignadoId = permissions.editAllProperties ? null : ((me as any)?.id ?? null)

    const body = (await request.json()) as { rows?: ImportRow[] }
    const rows = (body.rows ?? []).slice(0, MAX_ROWS)
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No hay filas para importar.' }, { status: 400 })
    }

    const db = createAdminClient()

    // Plan limit, measured against the whole batch rather than per row — a
    // starter plan with 48 of 50 used may import 2, not the entire feed.
    const plan = getPlan(await getSessionPlan())
    let remaining = Infinity
    if (plan.limites.propiedades !== 'ilimitado') {
      const { count } = await db
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
      remaining = Math.max(0, (plan.limites.propiedades as number) - (count ?? 0))
      if (remaining === 0) {
        return NextResponse.json(
          {
            error: `Límite alcanzado: tu plan ${plan.nombre} permite ${plan.limites.propiedades} propiedades.`,
            code: 'PLAN_LIMIT_REACHED',
          },
          { status: 403 },
        )
      }
    }

    // Existing references, so re-importing the same feed updates nothing twice.
    const { data: existing } = await db
      .from('properties')
      .select('reference')
      .eq('company_id', companyId)
      .not('reference', 'is', null)
    const seenRefs = new Set<string>(
      ((existing as { reference: string | null }[] | null) ?? [])
        .map((r) => (r.reference ?? '').trim().toLowerCase())
        .filter(Boolean),
    )

    const results: RowResult[] = []
    let imported = 0
    let limitHit = false

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i]
      const rowNum = i + 1
      const titulo = (raw.titulo ?? '').trim()

      if (!titulo) {
        results.push({ row: rowNum, titulo: '(sin título)', status: 'error', reason: 'Falta el título' })
        continue
      }

      const precio = parsePrice(raw.precio ?? '')
      if (precio === null) {
        results.push({ row: rowNum, titulo, status: 'error', reason: 'Precio inválido o vacío' })
        continue
      }

      const reference = firstValue(raw.reference ?? '')
      if (reference && seenRefs.has(reference.toLowerCase())) {
        results.push({ row: rowNum, titulo, status: 'skipped', reason: `Ya existe (ref. ${reference})` })
        continue
      }

      if (imported >= remaining) {
        limitHit = true
        results.push({ row: rowNum, titulo, status: 'skipped', reason: 'Límite del plan alcanzado' })
        continue
      }

      const payload = {
        company_id:      companyId,
        titulo,
        descripcion:     (raw.descripcion ?? '').trim(),
        precio,
        tipo:            parseOperacion(raw.tipo ?? '') ?? 'venta',
        reference:       reference || null,
        address:         (raw.address ?? '').trim() || null,
        ciudad:          (raw.ciudad ?? '').trim() || null,
        zona:            (raw.zona ?? '').trim() || null,
        region_label:    (raw.region_label ?? '').trim() || null,
        country_label:   (raw.country_label ?? '').trim() || 'Panamá',
        zip_code:        (raw.zip_code ?? '').trim() || null,
        latitude:        firstValue(raw.latitude ?? '') || null,
        longitude:       firstValue(raw.longitude ?? '') || null,
        bedrooms:        parseIntOrNull(raw.bedrooms ?? ''),
        bathrooms:       parseIntOrNull(raw.bathrooms ?? ''),
        garages:         parseIntOrNull(raw.garages ?? ''),
        area:            (raw.area ?? '').trim() || null,
        built_area:      (raw.built_area ?? '').trim() || null,
        main_image_url:  firstValue(raw.main_image_url ?? '') || null,
        property_type_label: (raw.property_type_label ?? '').trim() || null,
        owner:           (raw.owner ?? '').trim() || null,
        furnished:       parseBool(raw.furnished ?? ''),
        // Imported listings land unpublished on purpose: the agent reviews and
        // activates them rather than a feed silently going live on portals.
        estado_publicacion: 'inactivo',
        disponibilidad:     'disponible',
        agente_asignado_id: agenteAsignadoId,
      }

      const { error } = await (db.from('properties') as any).insert(payload)
      if (error) {
        results.push({ row: rowNum, titulo, status: 'error', reason: error.message })
      } else {
        imported++
        if (reference) seenRefs.add(reference.toLowerCase())
        results.push({ row: rowNum, titulo, status: 'imported' })
      }
    }

    return NextResponse.json({
      imported,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors:  results.filter((r) => r.status === 'error').length,
      limitHit,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
