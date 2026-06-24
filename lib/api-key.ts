import crypto from 'crypto'
import { createAdminClient } from './supabase'
import { canAccess } from './plans'
import { PlanId } from './types'

export function generateApiKey(): string {
  return `psk_live_${crypto.randomBytes(24).toString('hex')}`
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// Resolves the company_id for a request authenticated via
// `Authorization: Bearer <api key>`, or null if missing/invalid.
export async function authenticateApiKey(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return null

  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('id, plan_id')
    .eq('api_key_hash', hashApiKey(match[1].trim()))
    .single()

  if (!data) return null
  // API access requires Pro plan or above — a company that generated a key
  // on Pro and later downgraded loses access without needing to revoke the key.
  if (!canAccess((data as any).plan_id as PlanId, 'api')) return null

  return (data as any).id
}
