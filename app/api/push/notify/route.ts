import { NextRequest, NextResponse } from 'next/server'
import { sendPushToCompany } from '@/lib/push'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { companyId, title, message, url, tag } = body

  if (!companyId || !title || !message) {
    return NextResponse.json({ error: 'companyId, title and message are required' }, { status: 400 })
  }

  const result = await sendPushToCompany(companyId, { title, body: message, url, tag })
  return NextResponse.json({ ok: true, ...result })
}
