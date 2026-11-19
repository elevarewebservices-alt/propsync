// Encuentra24 CRM API client (leads). Same endpoint the standalone
// encuentra-wasi script uses: GET /api.php/v1/crm/index?slug=&limit= with the
// account's API key in the x-api-key header.

import type { Encuentra24RawLead } from './portal-leads'

export const ENCUENTRA24_API_URL = 'https://www.encuentra24.com/api.php/v1/crm/index'

export async function fetchEncuentra24Leads(
  { apiKey, slug, limit = 50 }: { apiKey: string; slug: string; limit?: number },
): Promise<Encuentra24RawLead[]> {
  const url = new URL(process.env.ENCUENTRA24_API_URL || ENCUENTRA24_API_URL)
  url.searchParams.set('slug', slug)
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url, {
    headers: { 'x-api-key': apiKey, accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 300)
    throw new Error(`Encuentra24 respondió ${res.status}${body ? `: ${body}` : ''}`)
  }
  const json = await res.json().catch(() => null) as { data?: unknown } | null
  return Array.isArray(json?.data) ? (json!.data as Encuentra24RawLead[]) : []
}
