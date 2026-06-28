'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'
import { PlanBadge } from '@/components/shared/PlanBadge'
import { Bell, CalendarDays, X, LogOut, User, BellOff, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { FollowUpNotification } from '@/lib/types'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { isNativeApp } from '@/lib/native'
import { cn } from '@/lib/utils'

function PropSyncLogo() {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/logo-mark.png"
        alt="PropSync"
        width={32}
        height={32}
        style={{ width: 32, height: 32, display: 'block', objectFit: 'contain' }}
      />
      <span className="text-lg font-bold text-foreground tracking-tight">PropSync</span>
    </div>
  )
}

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  // The native WebView has no browser chrome, so users can get stuck on a deep
  // screen with no way back. Show an in-app back button (native only), except
  // on the home/dashboard where there's nowhere to go back to.
  const [isNative, setIsNative] = useState(false)
  useEffect(() => { setIsNative(isNativeApp()) }, [])
  const showBack = isNative && pathname !== '/dashboard'
  const [notifications, setNotifications] = useState<FollowUpNotification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userName, setUserName] = useState('U')
  const [userEmail, setUserEmail] = useState('')
  const [planId, setPlanId] = useState<'starter' | 'pro'>('starter')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const push = usePushNotifications()

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata as { nombre?: string } | undefined
        const name = meta?.nombre ?? session.user.email ?? 'U'
        setUserName(name)
        setUserEmail(session.user.email ?? '')
      }
    })
    // Fetch agent's company plan
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.planId && ['starter','pro'].includes(d.planId)) setPlanId(d.planId as 'starter' | 'pro') })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/crm/notifications')
      .then((r) => r.ok ? r.json() : { count: 0, contacts: [] })
      .then((data) => setNotifications(data.contacts ?? []))
      .catch(() => {})
  }, [])

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const today = new Date().toISOString().split('T')[0]

  return (
    <header className="shrink-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Atrás"
            onClick={() => router.back()}
            className="-ml-2"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        <div className="md:hidden">
          <PropSyncLogo />
        </div>
        <div className="hidden md:block" />
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Plan badge has text and is the widest item — hide on mobile so the
            action icons always fit. */}
        <span className="hidden md:inline-flex">
          <PlanBadge planId={planId} />
        </span>

        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Seguimientos pendientes"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-background shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Seguimientos pendientes</p>
                <button onClick={() => setNotifOpen(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Sin seguimientos pendientes
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {notifications.map((n) => {
                    const isPast = n.fecha_seguimiento < today
                    return (
                      <Link
                        key={n.id}
                        href="/crm"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <CalendarDays className={`h-4 w-4 mt-0.5 shrink-0 ${isPast ? 'text-red-500' : 'text-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.nombre}</p>
                          <p className={`text-xs ${isPast ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {isPast ? 'Vencido · ' : ''}
                            {new Date(n.fecha_seguimiento + 'T12:00:00').toLocaleDateString('es', {
                              weekday: 'short', day: 'numeric', month: 'short',
                            })}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              <div className="border-t border-border px-4 py-2">
                <Link href="/crm" onClick={() => setNotifOpen(false)} className="text-xs text-blue-600 hover:underline">
                  Ver todos en CRM →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Push notification toggle — hidden on mobile to save header space */}
        {push.isSupported && (
          <Button
            variant="ghost"
            size="icon"
            title={push.isSubscribed ? 'Desactivar notificaciones push' : 'Activar notificaciones push'}
            onClick={() => push.isSubscribed ? push.unsubscribe() : push.requestPermission()}
            disabled={push.isLoading}
            className={cn('hidden sm:inline-flex', push.isSubscribed ? 'text-blue-600' : 'text-muted-foreground')}
          >
            {push.isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
        )}

        <ThemeToggle />

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            aria-label="Menú de usuario"
          >
            {userName.charAt(0).toUpperCase()}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-background shadow-lg z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
              <div className="p-1">
                <Link
                  href="/configuracion/general"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Mi perfil
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors w-full text-left text-red-600 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
