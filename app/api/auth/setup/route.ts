import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { provisionCompanyForUser } from '@/lib/provision'

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { nombre, empresa } = await request.json()
    const email = sessionUser.email

    if (!nombre || !empresa || !email || !sessionUser.id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await provisionCompanyForUser({
      userId: sessionUser.id,
      email,
      nombre,
      empresa,
    })

    if (!result) {
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, companyId: result.companyId })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
