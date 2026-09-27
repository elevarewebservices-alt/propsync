import { NextRequest, NextResponse } from 'next/server'
import {
  tourActor,
  ownedTour,
  tourDB,
  tourProjection,
  checkTourProperty,
  TourError,
} from '@/lib/virtual-tours-server'
import { UUID, validateTour } from '@/lib/virtual-tours'
import { tourFailure } from '@/lib/virtual-tours-server'
export const dynamic = 'force-dynamic'
type Context = { params: { id: string } }
export async function GET(_: NextRequest, { params }: Context) {
  try {
    if (!UUID.test(params.id)) throw new TourError('Tour no encontrado.', 404)
    return NextResponse.json(
      tourProjection(await ownedTour(params.id, await tourActor())),
    )
  } catch (e) {
    return tourFailure(e)
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const actor = await tourActor()
    const row = await ownedTour(params.id, actor)
    const body = await request.json()
    if (body.revision !== row.revision)
      throw new TourError(
        'Otro editor guardó cambios. Recarga antes de continuar.',
        409,
      )
    let document
    try {
      document = validateTour(body)
    } catch (e) {
      throw new TourError(e instanceof Error ? e.message : 'Datos inválidos.')
    }
    const status = body.status
    if (!['draft', 'published', 'unpublished'].includes(status))
      throw new TourError('Estado inválido.')
    if (status === 'published' && !document.scenes.length)
      throw new TourError('Añade al menos una escena antes de publicar.')
    await checkTourProperty(document.property_id, actor)
    // Verify ownership and existence of all referenced uploads before publishing/saving.
    const { data: files, error: storageError } = await tourDB()
      .storage.from('virtual-tours')
      .list(`${actor.companyId}/${row.id}`, { limit: 1000 })
    if (storageError)
      throw new TourError('No se pudieron verificar las imágenes.', 503)
    const names = new Set(
      (files ?? []).map((file: { name: string }) => file.name),
    )
    if (
      document.scenes.some(
        (s) => !names.has(s.image) || !names.has(s.thumbnail),
      )
    )
      throw new TourError(
        'Faltan imágenes. Vuelve a subir las escenas afectadas.',
      )
    const { data, error } = await tourDB()
      .from('virtual_tours')
      .update({
        document,
        status,
        slug: document.slug,
        property_id: document.property_id,
        revision: row.revision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('company_id', actor.companyId)
      .eq('revision', row.revision)
      .select('*')
      .maybeSingle()
    if (error?.code === '23505')
      throw new TourError('Ese slug ya está en uso.', 409)
    if (error) throw error
    if (!data)
      throw new TourError('El tour cambió. Recarga antes de guardar.', 409)
    return NextResponse.json(tourProjection(data))
  } catch (e) {
    return tourFailure(e)
  }
}
export async function DELETE(_: NextRequest, { params }: Context) {
  try {
    const actor = await tourActor()
    const row = await ownedTour(params.id, actor)
    const { error } = await tourDB()
      .from('virtual_tours')
      .delete()
      .eq('id', row.id)
      .eq('company_id', actor.companyId)
    if (error) throw error
    const bucket = tourDB().storage.from('virtual-tours')
    const prefix = `${actor.companyId}/${row.id}`
    const { data: files } = await bucket.list(prefix, { limit: 1000 })
    if (files?.length)
      await bucket.remove(
        files.map((f: { name: string }) => `${prefix}/${f.name}`),
      )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return tourFailure(e)
  }
}
