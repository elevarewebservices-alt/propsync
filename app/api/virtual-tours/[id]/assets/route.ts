import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import {
  tourActor,
  ownedTour,
  tourDB,
  TourError,
} from '@/lib/virtual-tours-server'
import { tourFailure } from '@/lib/virtual-tours-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await tourActor()
    await ownedTour(params.id, actor)
    if (Number(request.headers.get('content-length')) > 4_200_000)
      throw new TourError('La imagen debe pesar menos de 4 MB.', 413)
    const form = await request.formData()
    const file = form.get('file')
    if (
      !(file instanceof File) ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 4_194_304
    )
      throw new TourError('Sube una imagen JPG, PNG o WebP de hasta 4 MB.')
    const bytes = Buffer.from(await file.arrayBuffer())
    const image = sharp(bytes, { limitInputPixels: 60_000_000 }).rotate()
    const meta = await image.metadata()
    if (
      !['jpeg', 'png', 'webp'].includes(meta.format ?? '') ||
      (meta.pages ?? 1) > 1
    )
      throw new TourError('Formato de imagen no admitido.')
    const panorama = form.get('kind') === 'panorama'
    if (panorama && Math.abs((meta.width ?? 0) / (meta.height ?? 1) - 2) > 0.05)
      throw new TourError(
        'El panorama debe ser equirectangular 360° con proporción 2:1.',
      )
    const main = await image
      .clone()
      .resize({ width: panorama ? 4096 : 2400, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer()
    const thumb = await image
      .clone()
      .resize(320, 200, { fit: 'cover' })
      .webp({ quality: 72 })
      .toBuffer()
    const stem = randomUUID()
    const prefix = `${actor.companyId}/${params.id}`
    const bucket = tourDB().storage.from('virtual-tours')
    const { data: existing } = await bucket.list(prefix, { limit: 1000 })
    if ((existing?.length ?? 0) >= 500)
      throw new TourError('Límite de imágenes alcanzado para este tour.')
    const uploaded: string[] = []
    for (const [name, buffer] of [
      [`${stem}.webp`, main],
      [`${stem}-thumb.webp`, thumb],
    ] as const) {
      const key = `${prefix}/${name}`
      const { error } = await bucket.upload(key, buffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
      })
      if (error) {
        if (uploaded.length) await bucket.remove(uploaded)
        throw new TourError(
          'No se pudo subir la imagen. Intenta de nuevo.',
          503,
        )
      }
      uploaded.push(key)
    }
    return NextResponse.json({
      image: `${stem}.webp`,
      thumbnail: `${stem}-thumb.webp`,
    })
  } catch (e) {
    return tourFailure(e)
  }
}
