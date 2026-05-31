import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Legacy browser client (used in components that don't need auth state)
export const supabase = createClient<Database>(url, anon)

// Browser client with auth session tracking (use in client components for login/signup)
export function createBrowserSupabaseClient() {
  return createSupabaseBrowserClient<Database>(url, anon)
}

// Server client that reads/writes cookies (use in Server Components, Route Handlers, middleware)
export function createServerSupabaseClient(cookieStore: {
  get: (name: string) => string | undefined
  set: (name: string, value: string, options: Record<string, unknown>) => void
  remove: (name: string, options: Record<string, unknown>) => void
}) {
  return createSupabaseServerClient<Database>(url, anon, {
    cookies: {
      get: (name) => cookieStore.get(name),
      set: (name, value, options) => cookieStore.set(name, value, options),
      remove: (name, options) => cookieStore.remove(name, options),
    },
  })
}

// Server-side admin client (service_role — bypasses RLS — only in API routes / server actions)
export function createAdminClient() {
  return createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
