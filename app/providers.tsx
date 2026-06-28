'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeProvider } from 'next-themes'
import { createBrowserSupabaseClient } from '@/lib/supabase'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  // Password recovery safety net. When a user clicks the reset-password email
  // link, Supabase establishes a temporary "recovery" session and fires
  // PASSWORD_RECOVERY — but depending on where the link lands the user could
  // otherwise end up dumped straight into the app. Catching the event globally
  // guarantees they always reach /update-password to actually set a new one.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/update-password')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      {children}
    </ThemeProvider>
  )
}
