/**
 * ClipDrop Cleanup API (Stability AI) — removes watermarks/objects from an image
 * given a mask (white = remove, black = keep). Server-side only so the API key
 * stays secret. Set CLIPDROP_API_KEY in the environment.
 * Docs: https://clipdrop.co/apis/docs/cleanup
 */

const CLEANUP_URL = 'https://clipdrop-api.co/cleanup/v1'

export type CleanupResult =
  | { ok: true; buffer: ArrayBuffer; contentType: string }
  | { ok: false; error: string; status: number }

export async function clipdropCleanup(imageFile: Blob, maskFile: Blob): Promise<CleanupResult> {
  const key = process.env.CLIPDROP_API_KEY
  if (!key) {
    return { ok: false, error: 'La limpieza de imágenes no está configurada (falta CLIPDROP_API_KEY).', status: 503 }
  }

  const fd = new FormData()
  fd.append('image_file', imageFile, 'image.jpg')
  fd.append('mask_file', maskFile, 'mask.png')

  try {
    const res = await fetch(CLEANUP_URL, {
      method: 'POST',
      headers: { 'x-api-key': key },
      body: fd,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: text || `ClipDrop HTTP ${res.status}`, status: res.status === 429 ? 429 : 502 }
    }

    const buffer = await res.arrayBuffer()
    return { ok: true, buffer, contentType: res.headers.get('content-type') ?? 'image/png' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido', status: 502 }
  }
}
