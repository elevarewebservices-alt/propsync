import { NextResponse } from 'next/server'
import { adminOr403 } from '@/lib/admin'
import { resetDemoData } from '@/lib/demo-seed'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST /api/admin/demo-reset — "Reiniciar demo" button in the Elevare panel. */
export async function POST() {
  const admin = await adminOr403()
  if (admin instanceof NextResponse) return admin

  try {
    const result = await resetDemoData()
    console.info('[admin] demo reset', { by: admin, ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
