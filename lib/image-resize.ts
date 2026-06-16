// Client-side image downscaling before upload.
// Keeps payloads small (well under Vercel's request-body limit) and speeds up
// the public property pages. Falls back to the original file if anything fails.

export async function resizeImageFile(
  file: File,
  maxDim = 1920,
  quality = 0.82
): Promise<File> {
  // Only process raster images we can draw; skip if not an image.
  if (!file.type.startsWith('image/')) return file

  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    // Already small enough — keep as-is (avoids needless re-encode).
    if (width <= maxDim && height <= maxDim && file.size <= 1_500_000) {
      bitmap.close()
      return file
    }

    const scale = Math.min(1, maxDim / Math.max(width, height))
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return file }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close()

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob) return file

    const newName = file.name.replace(/\.(png|webp|heic|jpeg|jpg)$/i, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
