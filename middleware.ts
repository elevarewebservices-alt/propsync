import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isDemoEmail, isDemoBlockedApi, DEMO_BLOCKED_PAGES, DEMO_BLOCKED_MESSAGE } from '@/lib/demo'

const PROTECTED = [
  '/dashboard', '/propiedades', '/virtual-tours', '/crm', '/asistente',
  '/publicar', '/mantener', '/configuracion', '/suscripcion',
]

const AUTH_PAGES = ['/login', '/registro']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Public demo account: read/write sample data freely, but nothing that leaves
  // the platform, touches account control, or costs per call (see lib/demo.ts).
  if (session && isDemoEmail(session.user.email)) {
    if (isDemoBlockedApi(pathname, request.method)) {
      return NextResponse.json({ error: DEMO_BLOCKED_MESSAGE, code: 'DEMO_READONLY' }, { status: 403 })
    }
    if (DEMO_BLOCKED_PAGES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))

  // Unauthenticated user trying to access protected route → /login
  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user visiting login/registro → /dashboard
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
