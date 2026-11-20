// Account / teammate invitations that don't depend on Supabase's built-in
// mailer. Supabase's default SMTP only delivers to project-team addresses (and
// a few per hour) unless a custom SMTP is configured — so a real client often
// never got the old inviteUserByEmail() email.
//
// Instead: generate the invite link ourselves (auth.admin.generateLink, which
// creates the user but sends nothing), send it through our own transport
// (lib/email → Brevo/SMTP), and return it so the admin can also share it by
// WhatsApp. The link points at /auth/confirm?token_hash=…&type=…, verified
// server-side with verifyOtp (Supabase's SSR pattern) — it doesn't rely on
// URL-hash tokens reaching /auth/callback.

import { createClient } from '@supabase/supabase-js'

export interface InviteMetadata {
  nombre: string
  company_id: string
  rol: string
  invited: true
}

function authAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function appBase(origin?: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL || origin || 'https://www.propsyncia.com').replace(/\/$/, '')
}

/**
 * New user → 'invite' link (creates the auth user with the metadata the
 * callback needs to attach them to their agent row). If the user already
 * exists (re-sending, or the first link expired) → 'recovery' link, which also
 * lands them on "crea tu contraseña"; /auth/confirm still attaches the agent.
 */
export async function createInviteLink(
  email: string,
  data: InviteMetadata,
  origin?: string,
): Promise<{ link: string; type: 'invite' | 'recovery' }> {
  const admin = authAdmin()
  const invite = await admin.auth.admin.generateLink({ type: 'invite', email, options: { data } })
  let tokenHash = invite.data?.properties?.hashed_token
  let type: 'invite' | 'recovery' = 'invite'

  if (invite.error || !tokenHash) {
    const recovery = await admin.auth.admin.generateLink({ type: 'recovery', email })
    tokenHash = recovery.data?.properties?.hashed_token
    type = 'recovery'
    if (recovery.error || !tokenHash) {
      throw new Error(invite.error?.message || recovery.error?.message || 'No se pudo generar el enlace de invitación')
    }
    // Make sure the metadata is there for /auth/confirm even if the original
    // invite never completed (e.g. user created by an older flow).
    if (recovery.data.user && !recovery.data.user.user_metadata?.company_id) {
      await admin.auth.admin.updateUserById(recovery.data.user.id, { user_metadata: data }).catch(() => null)
    }
  }

  const url = new URL(`${appBase(origin)}/auth/confirm`)
  url.searchParams.set('token_hash', tokenHash)
  url.searchParams.set('type', type)
  return { link: url.toString(), type }
}
