'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Home,
  RefreshCw,
  Settings,
  Plug,
  CreditCard,
  Bot,
  KanbanSquare,
  Layers,
  Users,
  Sparkles,
  ChevronDown,
  TrendingUp,
  Users2,
  HelpCircle,
  MessageCircle,
  Map,
  Zap,
  BarChart2,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Pipeline } from '@/lib/types'

interface NavSubItem {
  label: string
  href: string
  icon?: React.ElementType
  color?: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: NavSubItem[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

function getNavSections(): NavSection[] {
  return [
    {
      title: 'General',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        {
          label: 'Propiedades',
          href: '/propiedades',
          icon: Home,
          children: [
            { label: 'Vista en mapa', href: '/propiedades/mapa', icon: Map },
          ],
        },
      ],
    },
    {
      title: 'CRM',
      items: [
        // Contactos with pipelines injected dynamically
        { label: 'Equipo', href: '/crm/equipo', icon: Users2 },
        { label: 'Reportes', href: '/crm/reportes', icon: BarChart2 },
        { label: 'Asistente IA', href: '/asistente', icon: Bot },
      ],
    },
    {
      title: 'Mantener',
      items: [
        {
          label: 'Automatizaciones',
          href: '/mantener',
          icon: RefreshCw,
          children: [
            { label: 'Reglas', href: '/mantener/automatizaciones', icon: Zap },
            { label: 'Campaña WhatsApp', href: '/mantener/campana-whatsapp', icon: MessageCircle },
          ],
        },
      ],
    },
    {
      title: 'Configuración',
      items: [
        { label: 'General', href: '/configuracion/general', icon: Settings },
        { label: 'Usuarios', href: '/configuracion/usuarios', icon: Users },
        { label: 'Pipelines & CRM', href: '/configuracion/crm', icon: Layers },
        { label: 'Descripción IA', href: '/configuracion/descripcion', icon: Sparkles },
        { label: 'Fuentes', href: '/configuracion/fuentes', icon: Plug },
        { label: 'Planes', href: '/configuracion/planes', icon: CreditCard },
      ],
    },
  ]
}

function PropSyncLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-4">
      <Image
        src="/logo-mark.png"
        alt="PropSync"
        width={36}
        height={36}
        priority
        style={{ width: 36, height: 36, display: 'block', objectFit: 'contain' }}
      />
      <div>
        <div className="text-base font-bold text-foreground leading-tight tracking-tight">PropSync</div>
        <div className="text-[10px] text-muted-foreground leading-tight">Tu inventario, siempre activo</div>
      </div>
    </Link>
  )
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [sections, setSections] = useState<NavSection[]>([])

  useEffect(() => {
    fetch('/api/crm/pipelines')
      .then((r) => r.ok ? r.json() : [])
      .then((data: Pipeline[]) => setPipelines(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const baseSections = getNavSections()

    const pipelineChildren = pipelines.map((p) => ({
      label: p.nombre,
      href: `/crm?pipeline=${p.slug}`,
      color: p.color,
    }))

    const updatedSections = baseSections.map((section) => {
      if (section.title === 'CRM') {
        return {
          ...section,
          items: [
            {
              label: 'Contactos',
              href: '/crm',
              icon: KanbanSquare,
              children: pipelineChildren.length > 0 ? pipelineChildren : undefined,
            },
            ...section.items,
          ],
        }
      }
      return section
    })



    setSections(updatedSections)
  }, [pipelines])

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [href]: !prev[href],
    }))
  }

  const isChildActive = (children?: NavSubItem[]) => {
    if (!children) return false
    return children.some((child) => pathname === child.href || pathname.startsWith(child.href))
  }

  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col border-r border-border bg-background',
        className
      )}
    >
      <PropSyncLogo />
      <Separator />
      <nav className="flex-1 overflow-y-auto py-4 min-h-0">
        {sections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? 'mt-4' : ''}>
            <div className="px-4 pb-1 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            </div>
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href)) ||
                isChildActive(item.children)
              const isExpanded = expandedItems[item.href]
              const hasChildren = item.children && item.children.length > 0

              return (
                <div key={item.href}>
                  {hasChildren ? (
                    <button
                      onClick={() => toggleExpand(item.href)}
                      className={cn(
                        'mx-2 w-[calc(100%-16px)] flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left',
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/40 dark:text-blue-300'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform',
                          isExpanded ? 'rotate-180' : ''
                        )}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        'mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/40 dark:text-blue-300'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  )}

                  {hasChildren && isExpanded && (
                    <div className="mt-1 space-y-1 pl-4">
                      {item.children!.map((child) => {
                        const childIsActive = pathname === child.href || (child.href !== '/crm' && pathname.startsWith(child.href.split('?')[0]) && pathname === child.href.split('?')[0])
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors',
                              childIsActive
                                ? 'font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            {child.color && (
                              <div
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: child.color }}
                              />
                            )}
                            {child.icon && <child.icon className="h-3.5 w-3.5 shrink-0" />}
                            <span className="flex-1">{child.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer — Ayuda / FAQ */}
      <div className="shrink-0 border-t border-border py-3">
        <Link
          href="/ayuda/faq"
          className={cn(
            'mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname.startsWith('/ayuda')
              ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/40 dark:text-blue-300'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">Preguntas frecuentes</span>
        </Link>
      </div>
    </aside>
  )
}
