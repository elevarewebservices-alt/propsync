// Public demo account — shared constants and guards.
//
// Kept free of server-only imports so middleware can use it. The demo is the
// real app signed into one shared company (DEMO_LOGIN_EMAIL). Browsing and
// creating/editing properties and contacts is allowed; anything that reaches
// outside the platform (WhatsApp, email, invites, portals), changes account
// control (billing, settings, API keys) or costs money per call (image AI,
// file storage) is blocked in middleware. Data is reset nightly by
// /api/cron/demo-reset (lib/demo-seed.ts).

export function demoEmail(): string | null {
  const e = process.env.DEMO_LOGIN_EMAIL?.trim().toLowerCase()
  return e ? e : null
}

export function isDemoEmail(email: string | null | undefined): boolean {
  const demo = demoEmail()
  return !!demo && !!email && email.toLowerCase() === demo
}

// Non-GET requests to these API prefixes are refused for the demo user.
export const DEMO_BLOCKED_API = [
  '/api/whatsapp',
  '/api/agents',
  '/api/configuracion',
  '/api/promo',
  '/api/subscription',
  '/api/push',
  '/api/brevo',
  '/api/automations',
  '/api/wasi',
  '/api/admin',
  '/api/images',
  '/api/upload',
  '/api/auth',
  '/api/crm/contacts/import',
  '/api/properties/import',
]

// Pages the demo user is sent away from (billing / account control).
export const DEMO_BLOCKED_PAGES = ['/suscripcion', '/configuracion/usuarios', '/configuracion/api']

export function isDemoBlockedApi(pathname: string, method: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false
  if (DEMO_BLOCKED_API.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true
  // Tour image uploads land in Supabase Storage — block them, keep tour editing.
  return /^\/api\/virtual-tours\/[^/]+\/assets/.test(pathname)
}

export const DEMO_BLOCKED_MESSAGE = 'Esta acción está desactivada en la demo. Crea tu cuenta para usarla.'
