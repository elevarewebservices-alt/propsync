import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { nombre, empresa, email, userId } = await request.json()

    if (!nombre || !empresa || !email || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = createAdminClient()

    // Check if agent already exists (idempotent)
    const { data: existing } = await (db.from('agents') as any)
      .select('id, company_id')
      .eq('auth_user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ ok: true, companyId: (existing as any).company_id })
    }

    // Create company
    const { data: company, error: companyError } = await (db.from('companies') as any)
      .insert({ nombre: empresa, email, plan_id: 'starter' })
      .select('id')
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }

    // Create agent (owner)
    const { error: agentError } = await (db.from('agents') as any)
      .insert({
        company_id: company.id,
        auth_user_id: userId,
        nombre,
        email,
        rol: 'owner',
        is_active: true,
      })

    if (agentError) {
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }

    // Non-blocking — don't fail setup if email fails
    sendWelcomeEmail(email, nombre, empresa, company.id).catch((err) =>
      console.error('[setup] welcome email failed:', err),
    )

    return NextResponse.json({ ok: true, companyId: company.id })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
