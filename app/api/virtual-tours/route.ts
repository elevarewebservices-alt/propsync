import { NextRequest, NextResponse } from 'next/server'
import {
  tourActor,
  tourDB,
  tourProjection,
  checkTourProperty,
  TourError,
  tourFailure,
} from '@/lib/virtual-tours-server'
import { validateTour } from '@/lib/virtual-tours'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const actor = await tourActor()
    let query = tourDB()
      .from('virtual_tours')
      .select('*')
      .eq('company_id', actor.companyId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (!actor.all) query = query.eq('created_by', actor.userId)
    const { data, error } = await query
    if (error)
      throw new TourError(
        'Virtual Tours no está disponible. Comprueba que la migración 029 esté aplicada.',
        503,
      )
    return NextResponse.json(data.map(tourProjection))
  } catch (e) {
    return tourFailure(e)
  }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await tourActor()
    let document
    try {
      document = validateTour(await request.json())
    } catch (e) {
      throw new TourError(e instanceof Error ? e.message : 'Datos inválidos.')
    }
    if (document.scenes.length)
      throw new TourError('Primero crea el tour y después sube sus escenas.')
    await checkTourProperty(document.property_id, actor)
    const { data, error } = await tourDB()
      .from('virtual_tours')
      .insert({
        company_id: actor.companyId,
        created_by: actor.userId,
        property_id: document.property_id,
        slug: document.slug,
        document,
      })
      .select('*')
      .single()
    if (error?.code === '23505')
      throw new TourError('Ese slug ya está en uso. Elige otro.', 409)
    if (error)
      throw new TourError(
        'No se pudo crear el tour. Comprueba la migración 029.',
        503,
      )
    return NextResponse.json(tourProjection(data), { status: 201 })
  } catch (e) {
    return tourFailure(e)
  }
}
