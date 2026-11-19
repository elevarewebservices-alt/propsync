import { NextRequest, NextResponse } from 'next/server'
import { syncAllEncuentra24 } from '@/lib/encuentra24-sync'
import { syncAllCompreOAlquile } from '@/lib/comprealquile-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/portales — portal integrations, for every company that
 * connected them:
 *   - Encuentra24: new leads → CRM contacts.
 *   - Compre o Alquile (OpenNavent API): publish/update/unpublish listings and
 *     import contacts.
 *
 * Pinged every 5 minutes from the Elevare droplet (deploy/portales-cron.example)
 * because Vercel Hobby only allows daily crons; vercel.json also runs it daily
 * as a fallback. Requires Authorization: Bearer CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [encuentra24, comprealquile] = await Promise.all([
    syncAllEncuentra24().catch((e) => [{ status: 'error', reason: String(e) }]),
    syncAllCompreOAlquile().catch((e) => [{ status: 'error', reason: String(e) }]),
  ])
  return NextResponse.json({ encuentra24, comprealquile })
}
