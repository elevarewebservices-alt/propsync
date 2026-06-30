// Rate limiters for /api/v1/* (audit finding M-04 — no Redis/KV is configured
// for this project, so this is an in-memory, per-instance stopgap). Each
// serverless instance has its own Map, so the real ceiling under multiple
// instances is N_instances × limit — good enough to stop abuse, not a precise
// distributed limit. Swap for Upstash/Vercel KV if/when traffic justifies it.

interface LimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

function makeLimiter(windowMs: number, limit: number) {
  const buckets = new Map<string, { count: number; resetAt: number }>()

  return function check(key: string): LimitResult {
    const now = Date.now()
    const bucket = buckets.get(key)

    if (!bucket || now >= bucket.resetAt) {
      const resetAt = now + windowMs
      buckets.set(key, { count: 1, resetAt })
      return { allowed: true, remaining: limit - 1, resetAt }
    }

    bucket.count += 1
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(limit - bucket.count, 0),
      resetAt: bucket.resetAt,
    }
  }
}

// Per-company limit — applies only after a valid API key authenticates.
export const checkApiRateLimit = makeLimiter(60_000, 20)

// Per-IP limit — applies to every request to /api/v1/*, valid key or not.
// Brute-forcing a 192-bit key is computationally infeasible regardless of
// rate limit; this exists to stop one IP from flooding the endpoint (and the
// Supabase lookup behind every attempt) with junk requests.
export const checkIpRateLimit = makeLimiter(60_000, 30)

// ── Public (unauthenticated) endpoint limiters, all keyed by client IP ───────
// Contact form: strict — a human submits once, so 5/min/IP stops spam bursts.
export const checkContactRateLimit = makeLimiter(60_000, 5)
// Public reads (property fichas): generous, just stops scraping floods.
export const checkPublicReadRateLimit = makeLimiter(60_000, 60)
// Inbound webhooks: legit providers can burst, but cap one IP so a flood can't
// rack up signature-verification calls / DB writes.
export const checkWebhookRateLimit = makeLimiter(60_000, 120)

// Helper to build a 429 with Retry-After from a limiter result.
export function rateLimited(resetAt: number): { headers: Record<string, string> } {
  return { headers: { 'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))) } }
}

// Vercel/most proxies set x-forwarded-for to "client, proxy1, proxy2" — the
// first entry is the original client.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
