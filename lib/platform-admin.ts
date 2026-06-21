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
