'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search, MessageCircle, Mail, Home, Users, Bot, Upload, Mail as MailIcon,
  Clapperboard, CreditCard, LayoutGrid, ChevronDown, LifeBuoy,
} from 'lucide-react'

// ─── Contacto de soporte ──────────────────────────────────────────────────────
// Cambia estos dos valores para actualizar el contacto que ven todos los usuarios.
const SUPPORT_WHATSAPP = '50765139139'           // Panamá (+507) · 6513-9139
const SUPPORT_EMAIL    = 'gerencia@elevarewebservices.com'

interface Topic {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  /** Extra words to match against the search that aren't in title/body. */
  keywords?: string
  href?: string
}

const TOPICS: Topic[] = [
  {
    icon: Home,
    title: 'Propiedades: tu inventario',
    body:
      'En Propiedades ves todo tu inventario. Cada propiedad tiene dos estados independientes: ' +
      'el de publicación (Activa, Destacada, Inactiva) que controla su visibilidad, y la disponibilidad ' +
      '(Disponible, Vendida, Alquilada). Puedes cambiarlos directo desde la tarjeta. Las propiedades que ' +
      'descartas van al Basurero (botón “Ver basurero”), donde siguen guardadas por si necesitas restaurarlas.',
    keywords: 'inventario estado publicacion disponibilidad activa destacada inactiva basurero vender alquilar',
    href: '/propiedades',
  },
  {
    icon: Upload,
    title: 'Importar propiedades (XML) y desde Wasi',
    body:
      'Puedes traer tu inventario de dos formas: “Importar Wasi” sincroniza desde tu cuenta de Wasi, e ' +
      '“Importar XML” acepta cualquier feed de listados. En el XML detectamos las propiedades y sus campos, ' +
      'y tú confirmas el mapeo antes de importar. Todo lo importado entra como Inactivo para que lo revises ' +
      'antes de publicarlo.',
    keywords: 'importar xml wasi feed sincronizar mapeo inventario',
    href: '/propiedades/importar',
  },
  {
    icon: LayoutGrid,
    title: 'CRM: contactos y pipelines',
    body:
      'El CRM organiza tus clientes en pipelines (embudos). Arriba eliges el pipeline (Posibles clientes, ' +
      'Cierres…) y puedes ver los contactos en tabla o en tablero Kanban. En el Kanban arrastras cada ' +
      'contacto entre etapas. Al abrir un contacto ves su termómetro de etapa, sus propiedades de interés, ' +
      'notas y actividad. Los leads de Meta y de tu formulario web entran aquí automáticamente.',
    keywords: 'crm contactos leads pipeline embudo kanban etapa termometro seguimiento clientes',
    href: '/crm',
  },
  {
    icon: Users,
    title: 'Usuarios y permisos del equipo',
    body:
      'Desde Configuración → Usuarios invitas a tu equipo por correo. Cada agente puede ser limitado a ver ' +
      'solo sus propias propiedades y contactos, o tener acceso completo. El dueño y los administradores ' +
      'gestionan la cuenta; los agentes trabajan su cartera.',
    keywords: 'usuarios equipo agentes permisos invitar rol dueño administrador',
    href: '/configuracion/usuarios',
  },
  {
    icon: Bot,
    title: 'Asistente IA',
    body:
      'El Asistente entiende lenguaje natural. Puedes pedirle estadísticas de tu inventario, buscar ' +
      'propiedades o clientes, y consultar tu actividad. Solo escribe tu instrucción y presiona Enter.',
    keywords: 'asistente ia inteligencia artificial chat estadisticas preguntar',
    href: '/asistente',
  },
  {
    icon: MailIcon,
    title: 'Correo y notificaciones',
    body:
      'PropSync envía recordatorios de seguimiento y avisos de nuevos leads por correo. Puedes conectar el ' +
      'correo de tu agencia en Configuración → General para que salgan desde tu propia dirección. Si no ' +
      'conectas uno, salen desde la cuenta de PropSync. También puedes activar notificaciones push en ' +
      'Preferencias.',
    keywords: 'correo email smtp notificaciones push recordatorios brevo remitente',
    href: '/configuracion/general',
  },
  {
    icon: Clapperboard,
    title: 'Tours virtuales',
    body:
      'En cada propiedad puedes crear un tour virtual: subes fotos normales y/o 360°, las ordenas y las ' +
      'etiquetas por ambiente. Se genera un enlace público que puedes compartir o incrustar en tu web con ' +
      'un iframe.',
    keywords: 'tour virtual 360 fotos panorama recorrido embed compartir',
  },
  {
    icon: CreditCard,
    title: 'Plan y facturación',
    body:
      'Tu plan define cuántas propiedades y usuarios puedes tener y qué funciones incluye. Puedes verlo y ' +
      'gestionarlo en Configuración → Planes.',
    keywords: 'plan planes facturacion precio pago suscripcion limite complemento addon',
    href: '/configuracion/planes',
  },
]

export default function AyudaPage() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<number | null>(0)

  const q = query.trim().toLowerCase()
  const filtered = q
    ? TOPICS.filter((t) =>
        (t.title + ' ' + t.body + ' ' + (t.keywords ?? '')).toLowerCase().includes(q),
      )
    : TOPICS

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-blue-600" /> Ayuda
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Cómo funciona PropSync. Busca un tema o escríbenos.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(null) }}
          placeholder="Buscar ayuda… (ej. importar, basurero, leads)"
          className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Topics */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-medium">No encontramos ese tema</p>
            <p className="text-xs text-muted-foreground mt-1">
              Escríbenos por WhatsApp y te ayudamos directamente.
            </p>
          </div>
        ) : (
          filtered.map((t) => {
            const realIndex = TOPICS.indexOf(t)
            const isOpen = open === realIndex || Boolean(q)
            const Icon = t.icon
            return (
              <div key={t.title} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen && !q ? null : realIndex)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-2 shrink-0">
                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="flex-1 text-sm font-medium">{t.title}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 -mt-1">
                    <p className="text-sm text-muted-foreground leading-relaxed">{t.body}</p>
                    {t.href && (
                      <Link href={t.href} className="inline-block mt-3 text-xs font-medium text-blue-600 hover:underline">
                        Ir a la sección →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Contact */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/30 p-6">
        <h2 className="text-sm font-semibold text-foreground">¿Necesitas más ayuda?</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Escríbenos y te respondemos lo antes posible. Estamos para ayudarte con cualquier cosa de PropSync.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hola, necesito ayuda con PropSync')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Ayuda con PropSync')}`}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-border bg-card hover:bg-muted/50 text-sm font-medium transition-colors"
          >
            <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
          </a>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Soporte de PropSync · creado por Elevare
        </p>
      </div>
    </div>
  )
}
