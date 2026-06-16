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

    // Seed the default CRM for the new company: 3 pipelines + 7 stages.
    // Best-effort — a CRM seeding hiccup must not block account creation.
    try {
      const { data: pipes } = await (db.from('pipelines') as any)
        .insert([
          { company_id: company.id, nombre: 'Posibles clientes', slug: 'posibles_clientes', color: '#3b82f6', position: 0 },
          { company_id: company.id, nombre: 'Contactos',         slug: 'contactos',         color: '#10b981', position: 1 },
          { company_id: company.id, nombre: 'Basurero',          slug: 'basurero',          color: '#ef4444', position: 2 },
        ])
        .select('id, slug')

      const posiblesId = (pipes as { id: string; slug: string }[] | null)
        ?.find((p) => p.slug === 'posibles_clientes')?.id ?? null

      const defaultStages: [string, string, string, number, boolean][] = [
        ['Nuevo Lead',          'nuevo_lead',        '#3b82f6', 0, false],
        ['Contactado',          'contactado',        '#f59e0b', 1, false],
        ['Visita Programada',   'visita',            '#8b5cf6', 2, false],
        ['Oferta / Negociando', 'oferta_negociando', '#f97316', 3, false],
        ['Cerrado',             'cerrado',           '#22c55e', 4, true],
        ['Descartado',          'descartado',        '#6b7280', 5, true],
        ['Basurero',            'basurero',          '#ef4444', 6, true],
      ]

      await (db.from('crm_stages') as any).insert(
        defaultStages.map(([nombre, slug, color, position, is_terminal]) => ({
          company_id: company.id,
          nombre,
          slug,
          color,
          position,
          is_terminal,
          pipeline_id: posiblesId,
        }))
      )
    } catch (seedErr) {
      console.error('[setup] CRM seeding failed:', seedErr)
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
