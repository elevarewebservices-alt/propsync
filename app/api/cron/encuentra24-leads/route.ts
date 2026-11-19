import { NextRequest, NextResponse } from 'next/server'
import { syncAllEncuentra24 } from '@/lib/encuentra24-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/encuentra24-leads — pulls new Encuentra24 leads into the CRM
 * for every company that connected its Encuentra24 account.
 *
 * Pinged every 5 minutes from the Elevare droplet (deploy/encuentra24-cron.example)
 * because Vercel Hobby only allows daily crons; vercel.json also runs it once a
 * day as a fallback. Requires Authorization: Bearer CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await syncAllEncuentra24()
  const totals = results.reduce(
    (t, r) => ({ created: t.created + r.created, merged: t.merged + r.merged, failed: t.failed + r.failed }),
    { created: 0, merged: 0, failed: 0 },
  )
  return NextResponse.json({ companies: results.length, ...totals, results })
}
