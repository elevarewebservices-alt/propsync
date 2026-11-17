import { NextRequest, NextResponse } from 'next/server'
import { resetDemoData } from '@/lib/demo-seed'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Nightly reset of the public demo company (scheduled in vercel.json). */
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.DEMO_LOGIN_EMAIL) return NextResponse.json({ skipped: 'demo no configurada' })

  try {
    const result = await resetDemoData()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/demo-reset]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
