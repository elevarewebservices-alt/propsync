import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase'

const ALLOWED: EmailOtpType[] = ['invite', 'recovery', 'magiclink', 'signup', 'email']

/**
 * GET /auth/confirm?token_hash=…&type=… — Supabase's server-side email-link
 * verification (verifyOtp sets the session cookies). Used by the links that
 * lib/invite.ts builds for new client accounts and teammates.
 *
 * Invited users are attached to their pre-created agent row here (same as
 * /auth/callback does for code-based links) and sent to set a password.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!tokenHash || !type || !ALLOWED.includes(type)) {
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
    },
  )

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const user = data.user
  const meta = user.user_metadata as { nombre?: string; company_id?: string; invited?: boolean }

  if (meta?.invited && meta?.company_id && user.email) {
    const db = createAdminClient()
    const { data: linked } = await (db.from('agents') as any)
      .update({ auth_user_id: user.id, is_active: true })
      .eq('company_id', meta.company_id)
      .eq('email', user.email.toLowerCase())
      .is('auth_user_id', null)
      .select('id')

    // Welcome email only the first time the account is activated.
    if (linked && linked.length > 0 && meta.nombre) {
      const { data: company } = await (db.from('companies') as any).select('nombre').eq('id', meta.company_id).single()
      const { sendAgentWelcomeEmail } = await import('@/lib/email')
      sendAgentWelcomeEmail(user.email, meta.nombre, company?.nombre ?? 'PropSync', meta.company_id).catch(() => {})
    }
  }

  // Invite and recovery links both mean "this person needs to (re)set a password".
  if (type === 'invite' || type === 'recovery') {
    return NextResponse.redirect(`${origin}/update-password`)
  }
  return NextResponse.redirect(`${origin}/dashboard`)
}
