import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { clipdropCleanup } from '@/lib/clipdrop'
import { makeLimiter } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Per-company cap — each call costs money at ClipDrop, so throttle to stop a
// runaway loop from racking up charges.
const limit = makeLimiter(60_000, 20)

export async function POST(request: NextRequest) {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const rl = limit(companyId)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas limpiezas seguidas. Espera un minuto.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    )
  }

  const form = await request.formData()
  const image = form.get('image_file')
  const mask = form.get('mask_file')
  if (!(image instanceof Blob) || !(mask instanceof Blob)) {
    return NextResponse.json({ error: 'Falta la imagen o la máscara' }, { status: 400 })
  }
  // Guard against oversized payloads (cost + abuse).
  if (image.size > 15_000_000) {
    return NextResponse.json({ error: 'La imagen es demasiado grande' }, { status: 413 })
  }

  const result = await clipdropCleanup(image, mask)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return new Response(result.buffer, {
    headers: { 'Content-Type': result.contentType, 'Cache-Control': 'no-store' },
  })
}
