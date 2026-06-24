'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Search, HelpCircle, MessageCircle, Mail, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface FAQCategory {
  title: string
  icon: string
  questions: FAQItem[]
}

interface FAQItem {
  question: string
  answer: string
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    title: 'Primeros pasos',
    icon: '🚀',
    questions: [
      {
        question: '¿Cómo agrego mi primera propiedad?',
        answer: 'Ve a Propiedades > Nueva propiedad. Completa el título, precio, ubicación y fotos. Los campos marcados con * son requeridos. También puedes sincronizar desde Wasi en Configuración > Fuentes.',
      },
      {
        question: '¿Cómo invito a otros agentes a mi cuenta?',
        answer: 'Ve a Configuración > Usuarios y haz clic en "Invitar agente". Recibirán un email con un enlace para crear su cuenta. Puedes asignarle el rol de Agente o Admin.',
      },
      {
        question: '¿Cómo cambio el logo y datos de mi agencia?',
        answer: 'Ve a Configuración > General. Allí puedes editar el nombre de la agencia, email de contacto y configurar tu SMTP para que los emails se envíen desde tu dominio.',
      },
    ],
  },
  {
    title: 'Propiedades',
    icon: '🏠',
    questions: [
      {
        question: '¿Cuál es la diferencia entre "estado de publicación" y "disponibilidad"?',
        answer: 'Estado de publicación controla si la propiedad se muestra en portales (Activo / Destacado / Inactivo). Disponibilidad indica el estado de la transacción (Disponible / Vendido / Alquilado). Son independientes.',
      },
      {
        question: '¿Cómo genero una descripción con IA?',
        answer: 'En el formulario de propiedad nueva, después de llenar los datos básicos (tipo, precio, ubicación, habitaciones), haz clic en el botón "Generar con IA" en la sección de Descripción. Puedes personalizar el prompt en Configuración > Descripción IA.',
      },
      {
        question: '¿Cómo vinculo un propietario a una propiedad?',
        answer: 'En el formulario de propiedad, en la sección "Propietario", empieza a escribir el nombre. Si existe en tu CRM, aparecerá en el dropdown. Si no existe, llena todos los campos y se creará automáticamente como contacto tipo "propietario".',
      },
      {
        question: '¿Cómo sincronizo propiedades desde Wasi?',
        answer: 'Ve a Configuración > Fuentes y agrega tus credenciales de Wasi. Luego presiona "Sincronizar ahora". También se ejecuta automáticamente todos los días via cron.',
      },
    ],
  },
  {
    title: 'CRM y Leads',
    icon: '👥',
    questions: [
      {
        question: '¿Cómo configuro mis etapas de CRM?',
        answer: 'Ve a Configuración > CRM Etapas. Puedes crear, editar y reordenar etapas con drag-and-drop. Cada etapa tiene color, posición y puede marcarse como terminal (Cerrado, Descartado).',
      },
      {
        question: '¿Cómo importo leads en bulk?',
        answer: 'Ve a CRM y haz clic en "Importar". Descarga la plantilla, llénala con tus contactos y súbela. El sistema valida los datos antes de importar.',
      },
      {
        question: '¿Cómo conecto Meta Lead Ads?',
        answer: 'Ve a Configuración > CRM Etapas. Allí verás la URL del webhook y un token único de tu empresa. Configúralo en Meta Business Manager bajo la app de WhatsApp/Leads.',
      },
      {
        question: '¿Por qué algunos contactos tienen un punto rojo?',
        answer: 'El punto rojo indica que tienen un seguimiento vencido. Es decir, su fecha de seguimiento ya pasó y no se ha actualizado la etapa. Revísalos prioritariamente.',
      },
    ],
  },
  {
    title: 'WhatsApp Business',
    icon: '💬',
    questions: [
      {
        question: '¿Cómo configuro WhatsApp Business?',
        answer: 'Ve a Configuración > WhatsApp. Necesitas: (1) Una app en Meta for Developers, (2) Tu Phone Number ID, (3) Un Access Token permanente del System User. La página tiene una guía paso a paso.',
      },
      {
        question: '¿Qué es una campaña de verificación?',
        answer: 'Es un envío masivo de WhatsApp a todos los propietarios de propiedades activas, preguntando si la propiedad sigue disponible. Las respuestas se procesan automáticamente y actualizan el estado de cada propiedad.',
      },
      {
        question: '¿Por qué necesito un template aprobado por Meta?',
        answer: 'Meta requiere templates pre-aprobados para iniciar conversaciones fuera de la ventana de 24h. Crea el template "property_availability_check" en Meta Business Manager y espera aprobación (1-24h).',
      },
      {
        question: '¿Cómo detecta el sistema si una propiedad ya se vendió?',
        answer: 'El sistema usa detección de palabras clave en las respuestas: "vendida", "alquilada", "sí disponible", "no disponible". Cuando detecta vendida, automáticamente cambia disponibilidad a "vendido" e inactiva la publicación.',
      },
    ],
  },
  {
    title: 'IA y Asistente',
    icon: '🤖',
    questions: [
      {
        question: '¿Qué puede hacer el Asistente IA?',
        answer: 'El asistente puede: buscar propiedades, ver detalles, actualizar estado y CRM, agregar notas, buscar contactos, crear contactos, ver seguimientos pendientes y dashboard stats. Solo escribe lo que necesitas en lenguaje natural.',
      },
      {
        question: '¿Cuántas consultas puedo hacer al mes?',
        answer: 'Depende de tu plan: Individual (200/mes), Pro (1000/mes). Una conversación puede usar múltiples consultas si el asistente necesita varias herramientas.',
      },
      {
        question: '¿Puedo personalizar las descripciones generadas?',
        answer: 'Sí. Ve a Configuración > Descripción IA y edita el prompt template. Usa variables como {tipo}, {ciudad}, {habitaciones}, {precio} para que el sistema las reemplace automáticamente.',
      },
    ],
  },
  {
    title: 'Planes y facturación',
    icon: '💳',
    questions: [
      {
        question: '¿Qué incluye cada plan?',
        answer: 'Individual ($30/mes): 50 propiedades, Facebook, 1 usuario. Pro ($60/mes): propiedades ilimitadas, conexión a portales, WhatsApp, marketing automation, API, 2 usuarios (+$7.99/usuario adicional).',
      },
      {
        question: '¿Cómo cambio de plan?',
        answer: 'Ve a Configuración > Planes. La integración con Stripe está en desarrollo. Por ahora, contacta a soporte para hacer el cambio manual.',
      },
      {
        question: '¿Qué pasa si supero el límite de propiedades?',
        answer: 'No podrás crear nuevas propiedades hasta liberar espacio (eliminando inactivas) o actualizando tu plan.',
      },
    ],
  },
  {
    title: 'Problemas técnicos',
    icon: '🔧',
    questions: [
      {
        question: 'Las fotos no se suben',
        answer: 'Verifica que el archivo sea JPG, PNG, WEBP o HEIC y no supere los 10 MB. Si el problema persiste, abre la consola del navegador (F12) y reporta el error.',
      },
      {
        question: 'No recibo emails de invitación',
        answer: 'Verifica que tu SMTP esté configurado en Configuración > General. Si usas Gmail necesitas crear un "app password" en tu cuenta de Google. Prueba enviando un email de prueba desde la misma página.',
      },
      {
        question: 'El asistente IA no responde',
        answer: 'Puede ser que hayas alcanzado el límite mensual de tu plan. Revisa en Configuración > Planes el contador de uso. También puede ser un problema temporal del servicio.',
      },
    ],
  },
]

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-lg border border-border bg-card overflow-hidden hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm font-medium text-foreground">{item.question}</p>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>
      {open && (
        <div className="px-4 pb-4 -mt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
        </div>
      )}
    </button>
  )
}

export default function FAQPage() {
  const [query, setQuery] = useState('')

  const filtered = FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    questions: cat.questions.filter((q) =>
      query.trim() === '' ||
      q.question.toLowerCase().includes(query.toLowerCase()) ||
      q.answer.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((cat) => cat.questions.length > 0)

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-foreground">Preguntas frecuentes</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Respuestas a las dudas más comunes sobre PropSync
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca tu pregunta..."
          className="pl-9"
        />
      </div>

      {/* Categories */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No se encontraron resultados para "{query}"
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map((category) => (
            <div key={category.title}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{category.icon}</span>
                <h2 className="text-base font-semibold text-foreground">{category.title}</h2>
              </div>
              <div className="space-y-2">
                {category.questions.map((q) => (
                  <FAQAccordion key={q.question} item={q} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Still need help */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-700/50 bg-gradient-to-br from-amber-50/40 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 p-6 mt-8">
        <h2 className="text-base font-semibold text-foreground mb-2">¿No encontraste lo que buscabas?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Nuestro equipo de soporte está disponible para ayudarte
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://wa.me/50765139139?text=Hola%2C%20necesito%20ayuda%20con%20PropSync"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp soporte
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
          <a
            href="mailto:soporte@elevarewebservices.com?subject=Ayuda%20PropSync"
            className="inline-flex items-center gap-2 rounded-lg bg-card border border-border hover:bg-muted text-foreground px-4 py-2 text-sm font-medium transition-colors"
          >
            <Mail className="h-4 w-4" />
            soporte@elevarewebservices.com
          </a>
          <Link
            href="/asistente"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Preguntar al Asistente IA
          </Link>
        </div>
      </div>
    </div>
  )
}
