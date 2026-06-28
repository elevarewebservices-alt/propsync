'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Home, KanbanSquare, RefreshCw, Bot, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMarketingAddon } from '@/hooks/useMarketingAddon'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Propiedades', href: '/propiedades', icon: Home },
  { label: 'CRM', href: '/crm', icon: KanbanSquare },
  { label: 'Mantener', href: '/mantener', icon: RefreshCw, addon: 'marketing' as const },
  { label: 'AI', href: '/asistente', icon: Bot },
  { label: 'Config', href: '/configuracion/general', icon: Settings },
]

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const hasMarketing = useMarketingAddon()

  // Hide add-on-only items (Mantener) until the add-on is confirmed active.
  const items = NAV_ITEMS.filter((item) => !('addon' in item) || hasMarketing === true)

  return (
    <nav
      className={cn(
        'border-t border-border bg-background z-40 pb-safe',
        className
      )}
    >
      <div className="flex w-full">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href.split('/').slice(0, 2).join('/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] transition-colors',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-blue-600 dark:text-blue-400')} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
