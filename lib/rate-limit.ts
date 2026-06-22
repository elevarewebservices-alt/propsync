// Per-company rate limiter for /api/v1/* (audit finding M-04 — no Redis/KV is
// configured for this project, so this is an in-memory, per-instance stopgap).
// Each serverless instance has its own Map, so the real ceiling under multiple
// instances is N_instances × LIMIT — good enough to stop a leaked key from
// being hammered, not a precise distributed limit. Swap for Upstash/Vercel KV
// if/when traffic justifies it.

const WINDOW_MS = 60_000
const LIMIT = 60

const buckets = new Map<string, { count: number; resetAt: number }>()

export function checkApiRateLimit(companyId: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const bucket = buckets.get(companyId)

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + WINDOW_MS
    buckets.set(companyId, { count: 1, resetAt })
    return { allowed: true, remaining: LIMIT - 1, resetAt }
  }

  bucket.count += 1
  return {
    allowed: bucket.count <= LIMIT,
    remaining: Math.max(LIMIT - bucket.count, 0),
    resetAt: bucket.resetAt,
  }
}
