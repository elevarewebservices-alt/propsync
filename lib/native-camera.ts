'use client'

import { getPlugin } from './native'

// Thin wrapper around the Capacitor Camera plugin (available only inside the
// native app at runtime). Returns standard File objects so the existing upload
// flow (resize → FormData → /api/upload) works unchanged.

interface CameraPlugin {
  getPhoto(opts: Record<string, unknown>): Promise<{ base64String?: string; format?: string; webPath?: string }>
  pickImages?(opts: Record<string, unknown>): Promise<{ photos: { webPath?: string; format?: string }[] }>
}

function base64ToFile(base64: string, format: string, idx = 0): File {
  const bin = atob(base64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  const ext = (format || 'jpeg').replace('jpg', 'jpeg')
  return new File([arr], `foto-${Date.now()}-${idx}.${ext}`, { type: `image/${ext}` })
}

// Take a single photo with the device camera.
export async function captureFromCamera(): Promise<File | null> {
  const Camera = getPlugin<CameraPlugin>('Camera')
  if (!Camera) return null
  const photo = await Camera.getPhoto({
    quality: 85,
    resultType: 'base64',
    source: 'CAMERA',
    allowEditing: false,
  })
  if (!photo.base64String) return null
  return base64ToFile(photo.base64String, photo.format ?? 'jpeg')
}

// Pick one or more images from the gallery.
export async function pickFromGallery(limit = 12): Promise<File[]> {
  const Camera = getPlugin<CameraPlugin>('Camera')
  if (!Camera?.pickImages) return []
  const res = await Camera.pickImages({ quality: 85, limit })
  const files: File[] = []
  for (const p of res.photos ?? []) {
    if (!p.webPath) continue
    try {
      const blob = await fetch(p.webPath).then((r) => r.blob())
      const ext = (p.format ?? 'jpeg').replace('jpg', 'jpeg')
      files.push(new File([blob], `foto-${Date.now()}-${files.length}.${ext}`, { type: blob.type || `image/${ext}` }))
    } catch {
      // skip a photo that fails to load
    }
  }
  return files
}
