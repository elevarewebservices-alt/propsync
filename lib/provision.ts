import { createAdminClient } from './supabase'
import { sendWelcomeEmail } from './email'
import { TRIAL_DAYS } from './subscription'
import { cleanText } from './validation'

/**
 * Creates a company + owner agent (and seeds the default CRM) for a freshly
 * signed-up user. Idempotent: if the user already has an agent row, it returns
 * that company id and does nothing else.
 *
 * This is the single source of truth for self-signup provisioning, used both by
 * POST /api/auth/setup (the normal path, right after email confirmation) and by
 * the self-heal in lib/auth.ts (which recovers users whose setup never ran —
 * e.g. when the confirmation link didn't route through /auth/callback).
 */
export async function provisionCompanyForUser(params: {
  userId: string
  email: string
  nombre: string
  empresa: string
}): Promise<{ companyId: string; created: boolean } | null> {
  const { userId, email } = params
  // Sanitize + cap the free-text inputs before they're stored.
  const nombre = cleanText(params.nombre, 120)
  const empresa = cleanText(params.empresa, 120)
  const db = createAdminClient()

  // Idempotent guard — never create a second company for the same user.
  const { data: existing } = await (db.from('agents') as any)
    .select('company_id')
    .eq('auth_user_id', userId)
    .single()
  if (existing) return { companyId: (existing as any).company_id, created: false }

  // Create company — starts a 15-day free trial. trial_ends_at is set
  // server-side here (clients can't write it), so the countdown can't be reset.
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: company, error: companyError } = await (db.from('companies') as any)
    .insert({
      nombre: empresa,
      email,
      plan_id: 'starter',
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt,
    })
    .select('id')
    .single()
  if (companyError || !company) return null
  const companyId = (company as any).id as string

  // Create the owner agent linked to the auth user
  const { error: agentError } = await (db.from('agents') as any)
    .insert({
      company_id: companyId,
      auth_user_id: userId,
      nombre,
      email,
      rol: 'owner',
      is_active: true,
    })
  if (agentError) return null

  // Seed the default CRM: 3 pipelines + 7 stages. Best-effort — a seeding
  // hiccup must not block account creation.
  try {
    const { data: pipes } = await (db.from('pipelines') as any)
      .insert([
        { company_id: companyId, nombre: 'Posibles clientes', slug: 'posibles_clientes', color: '#3b82f6', position: 0 },
        { company_id: companyId, nombre: 'Contactos',         slug: 'contactos',         color: '#10b981', position: 1 },
        { company_id: companyId, nombre: 'Basurero',          slug: 'basurero',          color: '#ef4444', position: 2 },
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
        company_id: companyId,
        nombre,
        slug,
        color,
        position,
        is_terminal,
        pipeline_id: posiblesId,
      }))
    )
  } catch (seedErr) {
    console.error('[provision] CRM seeding failed:', seedErr)
  }

  // Non-blocking welcome email
  sendWelcomeEmail(email, nombre, empresa, companyId).catch((err) =>
    console.error('[provision] welcome email failed:', err),
  )

  return { companyId, created: true }
}
