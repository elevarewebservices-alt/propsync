import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { demoEmail } from '@/lib/demo'
import { makeLimiter } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// 10 demo logins per IP per 10 minutes — enough for real visitors, stops
// scripted session farming.
const limiter = makeLimiter(10 * 60_000, 10)

/**
 * POST /api/demo/login — signs the visitor into the shared demo account and
 * redirects to the dashboard. Credentials never leave the server. Works as a
 * plain HTML form POST (no JS needed), so any "Ver demo" button can use it.
 */
export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin
  const email = demoEmail()
  const password = process.env.DEMO_LOGIN_PASSWORD
  if (!email || !password) {
    return NextResponse.redirect(`${origin}/demo?error=no_disponible`, 303)
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!limiter(ip).allowed) {
    return NextResponse.redirect(`${origin}/demo?error=demasiados_intentos`, 303)
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

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('[demo/login] sign-in failed:', error.message)
    return NextResponse.redirect(`${origin}/demo?error=no_disponible`, 303)
  }

  return NextResponse.redirect(`${origin}/dashboard`, 303)
}
