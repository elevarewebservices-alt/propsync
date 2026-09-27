import { NextRequest, NextResponse } from 'next/server'
import {
  tourActor,
  ownedTour,
  tourDB,
  TourError,
} from '@/lib/virtual-tours-server'
import { UUID, type TourScene } from '@/lib/virtual-tours'
import { tourFailure } from '@/lib/virtual-tours-server'
export const dynamic = 'force-dynamic'
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string; file: string } },
) {
  try {
    if (
      !UUID.test(params.id) ||
      !/^[0-9a-f-]{36}(-thumb)?\.webp$/.test(params.file)
    )
      throw new TourError('Imagen no encontrada.', 404)
    const { data: row } = await tourDB()
      .from('virtual_tours')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()
    if (!row) throw new TourError('Imagen no encontrada.', 404)
    const referenced = (row.document.scenes as TourScene[]).some(
      (s) => s.image === params.file || s.thumbnail === params.file,
    )
    if (row.status !== 'published' || !referenced)
      await ownedTour(params.id, await tourActor())
    const { data, error } = await tourDB()
      .storage.from('virtual-tours')
      .download(`${row.company_id}/${params.id}/${params.file}`)
    if (error || !data) throw new TourError('Imagen no encontrada.', 404)
    // Revalidate authorization on every request, including after unpublication.
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    return tourFailure(e)
  }
}
