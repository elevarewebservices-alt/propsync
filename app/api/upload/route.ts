import { NextRequest, NextResponse } from 'next/server'
import { uploadObject, createPresignedUploadUrl } from '@/lib/r2'
import { resolveCompanyId } from '@/lib/auth'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
const MAX_SIZE_MB = 15

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''

  // ── Proxy upload (FormData) — browser sends the file, we push it to R2 ──
  if (contentType.includes('multipart/form-data')) {
    let companyId: string
    try {
      companyId = await resolveCompanyId()
    } catch {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Tipo no permitido: ${file.type}` }, { status: 400 })
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Archivo muy grande (máx ${MAX_SIZE_MB} MB)` }, { status: 400 })
    }

    // Guard against missing/empty R2 config (a common Vercel env-var mistake)
    const missing = ['R2_ENDPOINT', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL']
      .filter((k) => !process.env[k]?.trim())
    if (missing.length) {
      console.error('[upload] missing R2 env vars:', missing.join(', '))
      return NextResponse.json({ error: 'Configuración R2 incompleta', detail: `Faltan: ${missing.join(', ')}` }, { status: 500 })
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const key = `properties/${companyId}/${randomUUID()}.${ext}`
    const bytes = Buffer.from(await file.arrayBuffer())

    try {
      const { publicUrl } = await uploadObject(key, bytes, file.type)
      return NextResponse.json({ url: publicUrl, publicUrl, key })
    } catch (err) {
      const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } }
      console.error('[upload] R2 upload failed:', e?.name, e?.message)
      // Surface the R2 error name so misconfig (e.g. wrong secret → SignatureDoesNotMatch)
      // is diagnosable from the client. No secrets are included.
      return NextResponse.json(
        { error: 'Error al subir la imagen', detail: e?.name ?? 'Unknown', status: e?.$metadata?.httpStatusCode ?? null },
        { status: 500 }
      )
    }
  }

  // ── Legacy presigned-URL flow (JSON) — kept for backward compatibility ──
  const { filename, contentType: ct, companyId } = await request.json() as {
    filename: string
    contentType: string
    companyId: string
  }

  if (!ALLOWED_TYPES.includes(ct)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
  }
  if (!companyId) {
    return NextResponse.json({ error: 'company_id requerido' }, { status: 400 })
  }

  const ext = filename.split('.').pop() ?? 'jpg'
  const key = `properties/${companyId}/${randomUUID()}.${ext}`

  try {
    const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, ct)
    return NextResponse.json({ uploadUrl, publicUrl, key, maxSizeMb: MAX_SIZE_MB })
  } catch {
    return NextResponse.json({ error: 'Error generando URL de subida' }, { status: 500 })
  }
}
