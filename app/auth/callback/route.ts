import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  // Password recovery — send to update-password page (session is already set)
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/update-password`)
  }

  const user = data.session.user
  const meta = user.user_metadata as {
    nombre?: string
    empresa?: string
    company_id?: string
    rol?: string
    invited?: boolean
  }

  const db = createAdminClient()

  if (meta?.invited && meta?.company_id) {
    // Invited agent: link auth_user_id to the pre-created agent row
    await (db.from('agents') as any)
      .update({ auth_user_id: user.id, is_active: true })
      .eq('company_id', meta.company_id)
      .eq('email', user.email)
      .is('auth_user_id', null)

    // Send onboarding email to the newly activated agent
    if (user.email && meta?.nombre) {
      const { data: company } = await (db.from('companies') as any)
        .select('nombre')
        .eq('id', meta.company_id)
        .single()
      const { sendAgentWelcomeEmail } = await import('@/lib/email')
      sendAgentWelcomeEmail(
        user.email,
        meta.nombre,
        (company as any)?.nombre ?? 'PropSync',
        meta.company_id,
      ).catch(() => {})
    }

    // Invited users have no password yet — send them to set one so they can
    // log in normally afterwards. The session is already active here.
    return NextResponse.redirect(`${origin}/update-password`)
  }

  if (meta?.nombre && meta?.empresa) {
    // New self-signup: create company + agent
    await fetch(`${origin}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: meta.nombre,
        empresa: meta.empresa,
        email: user.email,
        userId: user.id,
      }),
    })
  }

  return NextResponse.redirect(`${origin}${next}`)
}
