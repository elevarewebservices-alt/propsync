import { NextRequest, NextResponse } from 'next/server'
import { createPresignedUploadUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const MAX_SIZE_MB = 10

export async function POST(request: NextRequest) {
  const { filename, contentType, companyId } = await request.json() as {
    filename: string
    contentType: string
    companyId: string
  }

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
  }

  if (!companyId) {
    return NextResponse.json({ error: 'company_id requerido' }, { status: 400 })
  }

  const ext = filename.split('.').pop() ?? 'jpg'
  const key = `properties/${companyId}/${randomUUID()}.${ext}`

  try {
    const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, contentType)
    return NextResponse.json({ uploadUrl, publicUrl, key, maxSizeMb: MAX_SIZE_MB })
  } catch {
    return NextResponse.json({ error: 'Error generando URL de subida' }, { status: 500 })
  }
}
