// Platform-owner (Elevare) access control — separate from per-tenant auth.
// A platform admin can see ALL companies' usage, so the gate must be strict.
// Configurable via PLATFORM_ADMIN_EMAILS (comma-separated); defaults to Elevare.
export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const allow = (process.env.PLATFORM_ADMIN_EMAILS ?? 'elevarewebservices@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}

// Rough cost estimate per assistant request (Haiku + prompt caching).
// Tune as you measure real spend in the Anthropic console.
export const EST_COST_PER_REQUEST = 0.02

// ── R2 storage estimation ───────────────────────────────────────────────────
// Average size of an uploaded image AFTER client-side resize (~1920px, q0.82).
export const AVG_IMAGE_KB = 300
// Cloudflare R2 storage price per GB-month (egress is free on R2).
export const R2_STORAGE_PER_GB = 0.015

// Estimated GB stored for a given number of images.
export function estStorageGB(imageCount: number): number {
  return (imageCount * AVG_IMAGE_KB) / (1024 * 1024) // KB → GB
}
