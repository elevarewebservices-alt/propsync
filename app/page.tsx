'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ── Translations ─────────────────────────────────────────────────────────────
const T = {
  es: {
    badge: 'Base de datos · CRM · IA — todo en uno',
    h1: 'Tu agencia,',
    cycle: ['Centralizada.', 'Con CRM nativo.', 'Potenciada con IA.'],
    sub: 'PropSync es la plataforma integral de marketing, ventas y comunicación diseñada para inmobiliarias. Un solo lugar para gestionar todo tu negocio.',
    cta: 'Comenzar gratis',
    demo: 'Ver demo',
    nav: { platform: 'Plataforma', marketing: 'Marketing', ai: 'IA', pricing: 'Precios', contact: 'Contacto' },
    stats: [
      { val: '10×', label: 'Más rápido', sub: 'que gestión manual' },
      { val: '100%', label: 'Centralizado', sub: 'en una sola plataforma' },
      { val: '24/7', label: 'Activo', sub: 'con automatización IA' },
    ],

    // Platform statement
    platformBadge: 'Plataforma integral',
    platformTitle: 'Marketing, ventas y comunicación — en un solo lugar.',
    platformSub: 'PropSync centraliza toda la operación de tu negocio inmobiliario. Desde el primer contacto con el lead hasta el cierre del negocio, sin salir de la plataforma.',
    platformPills: ['Base de datos', 'CRM nativo', 'Marketing automation', 'Captación de leads', 'Asistente IA', 'Tour virtual 360°', 'API REST', 'Web widget', 'Webhooks', 'Reportes', 'Multi-usuario', 'Meta Lead Ads'],

    // How it works - pillars
    howTitle: 'Tres pilares',
    howSub: 'Una plataforma construida sobre lo que realmente importa',
    steps: [
      { n: '01', t: 'Base de datos central', b: 'Importa desde Wasi, carga manualmente o conecta tus fuentes. PropSync crea una base de datos única y estructurada de todo tu inventario, sin duplicados y siempre actualizada.' },
      { n: '02', t: 'CRM nativo integrado', b: 'Pipeline completo con etapas, clientes asignados, seguimiento, notas inmutables e historial completo — todo dentro de PropSync, sin apps externas.' },
      { n: '03', t: 'Inteligencia artificial', b: 'El asistente IA redacta descripciones, responde preguntas sobre tu cartera, analiza tendencias y contacta propietarios automáticamente.' },
    ],

    // Marketing
    mktTitle: 'Automatización de marketing y captación de leads',
    mktSub: 'Tu sitio web captura leads directamente a tu CRM. PropSync los nutre automáticamente con WhatsApp, email y seguimiento hasta el cierre.',
    mktPoints: [
      'Widget de búsqueda en tu web captura leads al CRM',
      'Campañas de WhatsApp y email automatizadas',
      'Seguimiento automático de interesados por propiedad',
      'Alertas de nuevas propiedades a leads existentes',
      'Reportes de conversión lead → cierre',
    ],
    mktNoti: [
      { icon: '🟢', title: 'Nuevo lead capturado', l1: 'María García · maria@gmail.com', l2: 'Interesada: Apto Punta Pacífica', time: '2 min' },
      { icon: '📱', title: 'WhatsApp enviado automáticamente', l1: 'José Rodríguez · propietario', l2: 'Verificación de disponibilidad', time: '5 min' },
      { icon: '✅', title: 'Disponibilidad confirmada', l1: 'Casa Costa del Este · #B-1823', l2: 'Estado actualizado en base de datos', time: '8 min' },
    ],

    // AI Agent
    agentTitle: 'El agente que nunca duerme',
    agentSub: 'Un asistente de IA que contacta propietarios, actualiza disponibilidad, responde clientes y mantiene todo tu inventario activo — sin intervención humana.',
    agentPoints: [
      'Contacta propietarios por WhatsApp automáticamente',
      'Actualiza disponibilidad en tiempo real',
      'Responde consultas de clientes 24/7',
      'Redacta y optimiza descripciones de propiedades',
      'Agenda visitas y sincroniza el CRM',
      'Detecta y alerta sobre propiedades sin actividad',
    ],
    agentChat: {
      header: 'PropSync IA',
      online: 'en línea',
      msg1: 'Hola José! Soy el asistente de Inmobiliaria Las Palmas. Tu propiedad en Punta Pacífica (#A-2341) — ¿sigue disponible para visitas? 🏠',
      time1: '13:42',
      reply: 'Sí, disponible. Pueden visitar martes y jueves 👍',
      time2: '13:45',
      updates: ['Propiedad #A-2341 → Disponible', 'Base de datos actualizada', '3 interesados notificados', 'Visitas: mar. y jue. agendadas'],
      time3: '13:45',
    },

    // Web integration + API
    webApiTitle: 'Conecta tu sitio web y tu stack tecnológico',
    webApiSub: 'PropSync se integra con tu sitio web existente y expone una API REST completa para conectar cualquier herramienta.',
    webTitle: 'Widget para tu sitio web',
    webSub: 'Un script de dos líneas inserta un buscador de propiedades en tu web. Los leads se capturan automáticamente en tu CRM.',
    apiTitle: 'API REST + Webhooks',
    apiSub: 'Acceso completo a tu inventario desde cualquier aplicación. Webhooks en tiempo real para integraciones avanzadas.',
    apiFeatures: ['Autenticación con API key', 'Filtros por precio, zona, tipo', 'Paginación + ordenamiento', 'Webhooks para cambios de estado', 'SDK para JavaScript y Python'],

    // Pricing
    plansTitle: 'Planes',
    plansSub: 'Elige el nivel que se adapta a tu agencia',
    trialBadge: '15 días de prueba gratis',
    trialSub: 'Sin tarjeta de crédito · Cancela cuando quieras',
    plans: [
      { n: 'Individual', p: '$30', per: '/mes', d: 'Para agentes independientes', f: ['50 propiedades', 'Base de datos centralizada', 'CRM básico', 'Asistente IA limitado', 'Conexión a portales (Compre o Alquile, Encuentra24, Página web)', '1 usuario'], cta: 'Probar 15 días gratis' },
      { n: 'Pro', p: '$60', per: '/mes', d: 'Para equipos en crecimiento', popular: true, f: ['200 propiedades', 'CRM completo + pipeline', 'Asistente IA completo', 'Conexión a portales (Compre o Alquile, Encuentra24, Página web)', '2 usuarios (+$7.99/usuario adicional)', 'Web widget + API'], cta: 'Probar 15 días gratis' },
    ],

    ctaBand: 'Tu agencia, en una sola plataforma.',
    ctaBandSub: 'Sin tarjeta de crédito. Sin instalaciones.',
    ctaBandBtn: 'Crear cuenta gratis',
    footerTagline: 'Marketing · CRM · IA para inmobiliarias.',
    credit: 'Creado por',

    // 3D Tours
    tourBadge: 'Recorridos virtuales',
    tourTitle: 'Tour virtual 360° para cada propiedad.',
    tourSub: 'Tus clientes recorren cualquier propiedad desde cualquier parte del mundo. Sube fotos panorámicas 360° o fotos regulares — PropSync crea el tour y genera el enlace para compartir e incrustar en tu sitio web.',
    tourPoints: [
      'Fotos regulares con animación Ken Burns inmersiva',
      'Fotos panorámicas 360° con navegación libre',
      'Enlace público para compartir con clientes',
      'Código iframe para incrustar en cualquier sitio web',
      'Reduce visitas innecesarias y acelera el cierre',
      'Accesible desde desktop y móvil sin apps adicionales',
    ],
    tourLabel: 'Tour 360° · Piso 8 · 120 m²',
    tourDemo: 'Ver demo',

    // How it works step-by-step
    howWorksTitle: 'Cómo funciona',
    howWorksSub: 'De cero a completamente operativo en minutos',
    howWorksSteps: [
      { n: '01', t: 'Conecta tus fuentes', b: 'Importa desde Wasi con un clic, sube propiedades manualmente o conecta tus formularios web y Meta Lead Ads. PropSync unifica todo.' },
      { n: '02', t: 'Construye tu inventario', b: 'Cada propiedad tiene ficha completa: fotos, precio, área, tour 360°, notas y historial. Sin duplicados, siempre actualizado.' },
      { n: '03', t: 'Captura y gestiona leads', b: 'Los leads llegan desde tu web, Meta Ads o manualmente. El CRM Kanban los organiza: Nuevo → Contactado → Visita → Oferta → Cerrado.' },
      { n: '04', t: 'Automatiza el seguimiento', b: 'Notificaciones por email, recordatorios automáticos y alertas de seguimiento. Tu equipo siempre sabe qué hacer y cuándo.' },
      { n: '05', t: 'Publica y cierra', b: 'Publica en portales con un clic, comparte tours 360° y accede a reportes de conversión en tiempo real para optimizar tu pipeline.' },
    ],

    // Contact
    contactTitle: '¿Tienes preguntas?',
    contactSub: 'Nuestro equipo está listo para ayudarte a configurar PropSync para tu agencia. Escríbenos o llámanos.',
    contactPhone: '+507 6513-9139',
    contactEmail: 'gerencia@elevarewebservices.com',
    contactTypes: [
      { value: 'soporte', label: 'Soporte técnico' },
      { value: 'ventas',  label: 'Consulta de ventas' },
      { value: 'otro',    label: 'Otra consulta' },
    ],
    contactFields: {
      name: 'Tu nombre',
      email: 'Tu email',
      type: 'Tipo de consulta',
      message: 'Cuéntanos en qué podemos ayudarte...',
      send: 'Enviar mensaje',
      sending: 'Enviando...',
      sent: '¡Mensaje enviado! Te contactaremos pronto.',
      error: 'No se pudo enviar.',
    },

    // Add-on services
    addonsBadge: 'Servicios adicionales',
    addonsTitle: 'Potencia tu agencia con servicios gestionados',
    addonsSub: 'Estas integraciones requieren configuración personalizada. El equipo de Elevare las instala y gestiona por ti.',
    addons: [
      {
        icon: '💬',
        tag: 'Add-on',
        name: 'WhatsApp para propietarios',
        description: 'Automatiza el contacto con propietarios vía WhatsApp para verificar disponibilidad. El sistema envía mensajes masivos, procesa las respuestas y actualiza el estado de cada propiedad en PropSync automáticamente.',
        includes: ['Integración con WhatsApp Business API', 'Mensajes masivos a propietarios', 'Procesamiento automático de respuestas', 'Actualización automática de disponibilidad'],
        cta: 'Consultar',
      },
      {
        icon: '📘',
        tag: 'Add-on',
        name: 'Publicación automática en Facebook',
        description: 'Publica propiedades automáticamente en tu página de Facebook e Instagram. El equipo de Elevare configura la integración con la API de Meta, diseña los templates y activa la publicación automática.',
        includes: ['Integración con Facebook Business API', 'Publicación automática de nuevas propiedades', 'Templates personalizados con tu branding', 'Gestión de anuncios y audiencias'],
        cta: 'Consultar',
      },
    ] as { icon: string; tag: string; name: string; description: string; includes: string[]; cta: string }[],
    addonsNote: 'Gestionado por Elevare · Precio acordado según configuración',
  },

  en: {
    badge: 'Database · CRM · AI — all in one',
    h1: 'Your agency,',
    cycle: ['Centralized.', 'With native CRM.', 'AI-powered.'],
    sub: 'PropSync is the all-in-one marketing, sales, and client communication platform designed for real estate agencies. One place to run your entire business.',
    cta: 'Start for free',
    demo: 'Watch demo',
    nav: { platform: 'Platform', marketing: 'Marketing', ai: 'AI', pricing: 'Pricing', contact: 'Contact' },
    stats: [
      { val: '10×', label: 'Faster', sub: 'than manual management' },
      { val: '100%', label: 'Centralized', sub: 'in a single platform' },
      { val: '24/7', label: 'Active', sub: 'with AI automation' },
    ],

    platformBadge: 'Integral platform',
    platformTitle: 'Marketing, sales and communication — in one place.',
    platformSub: 'PropSync centralizes your entire real estate business operation. From the first lead contact to deal close, without leaving the platform.',
    platformPills: ['Property database', 'Native CRM', 'Marketing automation', 'Lead capture', 'AI assistant', '360° virtual tour', 'REST API', 'Web widget', 'Webhooks', 'Reports', 'Multi-user', 'Meta Lead Ads'],

    howTitle: 'Three pillars',
    howSub: 'A platform built on what truly matters',
    steps: [
      { n: '01', t: 'Central property database', b: 'Import from Wasi, upload manually, or connect your sources. PropSync creates a single, structured database of your entire inventory — no duplicates, always up to date.' },
      { n: '02', t: 'Native integrated CRM', b: 'Full pipeline with stages, assigned clients, follow-ups, immutable notes and complete history — all inside PropSync, no external apps required.' },
      { n: '03', t: 'Artificial intelligence', b: 'The AI assistant drafts descriptions, answers questions about your portfolio, analyzes trends, and contacts property owners automatically.' },
    ],

    mktTitle: 'Marketing automation and lead capture',
    mktSub: 'Your website captures leads directly into your CRM. PropSync nurtures them automatically via WhatsApp, email, and follow-up until close.',
    mktPoints: [
      'Search widget on your site captures leads to CRM',
      'Automated WhatsApp and email campaigns',
      'Automatic follow-up of interested buyers per property',
      'Alerts for new matching properties to existing leads',
      'Conversion reports: lead → close',
    ],
    mktNoti: [
      { icon: '🟢', title: 'New lead captured', l1: 'María García · maria@gmail.com', l2: 'Interested in: Apto Punta Pacífica', time: '2 min' },
      { icon: '📱', title: 'WhatsApp sent automatically', l1: 'José Rodríguez · owner', l2: 'Availability verification', time: '5 min' },
      { icon: '✅', title: 'Availability confirmed', l1: 'Casa Costa del Este · #B-1823', l2: 'Status updated in database', time: '8 min' },
    ],

    agentTitle: 'The agent that never sleeps',
    agentSub: 'An AI assistant that contacts property owners, updates availability, answers clients, and keeps your entire inventory active — without human intervention.',
    agentPoints: [
      'Contacts owners automatically via WhatsApp',
      'Updates availability in real time',
      'Answers client inquiries 24/7',
      'Drafts and optimizes property descriptions',
      'Schedules visits and syncs the CRM',
      'Detects and alerts on inactive listings',
    ],
    agentChat: {
      header: 'PropSync AI',
      online: 'online',
      msg1: 'Hi José! I\'m the assistant from Las Palmas Realty. Your property in Punta Pacífica (#A-2341) — is it still available for visits? 🏠',
      time1: '1:42 PM',
      reply: 'Yes, available. They can visit Tuesday and Thursday 👍',
      time2: '1:45 PM',
      updates: ['Property #A-2341 → Available', 'Database updated', '3 interested buyers notified', 'Visits: Tue & Thu scheduled'],
      time3: '1:45 PM',
    },

    webApiTitle: 'Connect your website and tech stack',
    webApiSub: 'PropSync integrates with your existing website and exposes a full REST API to connect any tool.',
    webTitle: 'Widget for your website',
    webSub: 'A two-line script embeds a property search on your site. Leads are captured automatically into your CRM.',
    apiTitle: 'REST API + Webhooks',
    apiSub: 'Full access to your inventory from any application. Real-time webhooks for advanced integrations.',
    apiFeatures: ['API key authentication', 'Filter by price, zone, type', 'Pagination + sorting', 'Status-change webhooks', 'JavaScript and Python SDK'],

    plansTitle: 'Plans',
    plansSub: 'Choose the tier that fits your agency',
    trialBadge: '15-day free trial',
    trialSub: 'No credit card · Cancel anytime',
    plans: [
      { n: 'Individual', p: '$30', per: '/mo', d: 'For independent agents', f: ['50 properties', 'Centralized database', 'Basic CRM', 'Limited AI assistant', 'Portal connections (Compre o Alquile, Encuentra24, Web page)', '1 user'], cta: 'Start 15-day free trial' },
      { n: 'Pro', p: '$60', per: '/mo', d: 'For growing teams', popular: true, f: ['200 properties', 'Full CRM + pipeline', 'Full AI assistant', 'Portal connections (Compre o Alquile, Encuentra24, Web page)', '2 users (+$7.99/extra user)', 'Web widget + API'], cta: 'Start 15-day free trial' },
    ],

    ctaBand: 'Your agency, in one platform.',
    ctaBandSub: 'No credit card. No installations.',
    ctaBandBtn: 'Create free account',
    footerTagline: 'Marketing · CRM · AI for real estate.',
    credit: 'Created by',

    // 3D Tours
    tourBadge: 'Virtual walkthroughs',
    tourTitle: 'Virtual 360° tour for every property.',
    tourSub: 'Your clients walk through any property from anywhere in the world. Upload regular or 360° panoramic photos — PropSync creates the tour and generates a shareable link and embed code for your website.',
    tourPoints: [
      'Regular photos with immersive Ken Burns animation',
      '360° panoramic photos with free-look navigation',
      'Public shareable link for each property',
      'Iframe embed code for any website',
      'Reduces unnecessary visits and speeds close',
      'Works on desktop and mobile — no apps required',
    ],
    tourLabel: '360° Tour · Floor 8 · 120 m²',
    tourDemo: 'View demo',

    // How it works step-by-step
    howWorksTitle: 'How it works',
    howWorksSub: 'From zero to fully operational in minutes',
    howWorksSteps: [
      { n: '01', t: 'Connect your sources', b: 'Import from Wasi in one click, upload manually, or connect your web forms and Meta Lead Ads. PropSync unifies everything.' },
      { n: '02', t: 'Build your inventory', b: 'Every property has a complete profile: photos, price, area, 360° tour, notes, and history. No duplicates, always up to date.' },
      { n: '03', t: 'Capture and manage leads', b: 'Leads arrive from your website, Meta Ads, or manually. The Kanban CRM organizes them: New → Contacted → Visit → Offer → Closed.' },
      { n: '04', t: 'Automate follow-ups', b: 'Email notifications, automatic reminders, and follow-up alerts. Your team always knows what to do and when.' },
      { n: '05', t: 'Publish and close', b: 'Publish to portals in one click, share 360° tours with clients, and access real-time conversion reports to optimize your pipeline.' },
    ],

    // Contact
    contactTitle: 'Have questions?',
    contactSub: 'Our team is ready to help you get PropSync set up for your agency. Write to us or give us a call.',
    contactPhone: '+507 6513-9139',
    contactEmail: 'gerencia@elevarewebservices.com',
    contactTypes: [
      { value: 'soporte', label: 'Technical support' },
      { value: 'ventas',  label: 'Sales inquiry' },
      { value: 'otro',    label: 'Other' },
    ],
    contactFields: {
      name: 'Your name',
      email: 'Your email',
      type: 'Inquiry type',
      message: 'Tell us how we can help...',
      send: 'Send message',
      sending: 'Sending...',
      sent: 'Message sent! We\'ll be in touch soon.',
      error: 'Could not send.',
    },

    // Add-on services
    addonsBadge: 'Add-on services',
    addonsTitle: 'Supercharge your agency with managed integrations',
    addonsSub: 'These integrations require custom setup. The Elevare team installs and manages them for you.',
    addons: [
      {
        icon: '💬',
        tag: 'Add-on',
        name: 'WhatsApp for property owners',
        description: 'Automate outreach to property owners via WhatsApp to verify availability. The system sends bulk messages, processes responses, and automatically updates each property\'s status in PropSync.',
        includes: ['WhatsApp Business API integration', 'Bulk messaging to property owners', 'Automatic response processing', 'Automatic availability updates'],
        cta: 'Inquire',
      },
      {
        icon: '📘',
        tag: 'Add-on',
        name: 'Automatic Facebook publishing',
        description: 'Publish properties automatically to your Facebook and Instagram pages. The Elevare team sets up the Meta API integration, designs templates, and activates the full publishing automation.',
        includes: ['Facebook Business API integration', 'Automatic publishing of new listings', 'Custom templates with your branding', 'Ad management and audience targeting'],
        cta: 'Inquire',
      },
    ] as { icon: string; tag: string; name: string; description: string; includes: string[]; cta: string }[],
    addonsNote: 'Managed by Elevare · Pricing agreed per configuration',
  },
}
type Lang = 'es' | 'en'

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Reveal({ children, delay = 0, from = 'bottom', className = '' }: {
  children: React.ReactNode; delay?: number; from?: 'bottom' | 'left' | 'right'; className?: string
}) {
  const { ref, visible } = useReveal()
  const transforms: Record<string, string> = {
    bottom: visible ? 'translateY(0)' : 'translateY(36px)',
    left:   visible ? 'translateX(0)' : 'translateX(-44px)',
    right:  visible ? 'translateX(0)' : 'translateX(44px)',
  }
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: transforms[from],
      transition: `opacity 0.85s ${delay}ms cubic-bezier(.16,1,.3,1), transform 0.85s ${delay}ms cubic-bezier(.16,1,.3,1)`,
    }}>
      {children}
    </div>
  )
}

const F = 'var(--font-outfit), sans-serif'

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('es')
  const [scrolled, setScrolled] = useState(false)
  const [cycleIdx, setCycleIdx] = useState(0)
  const [cycleFade, setCycleFade] = useState(true)
  const t = T[lang]

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setCycleFade(false)
      const tid = setTimeout(() => { setCycleIdx(i => (i + 1) % t.cycle.length); setCycleFade(true) }, 380)
      return () => clearTimeout(tid)
    }, 2800)
    return () => clearInterval(id)
  }, [t.cycle.length])

  const toggleLang = useCallback(() => setLang(l => l === 'es' ? 'en' : 'es'), [])

  const [contactForm, setContactForm] = useState({ name: '', email: '', type: 'soporte', message: '' })
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [contactError, setContactError]   = useState('')

  // Feature carousel
  const CAROUSEL_COUNT = 5
  const [featureTab, setFeatureTab] = useState(0)
  const [tabProgress, setTabProgress] = useState(0)
  const [fadingTab, setFadingTab] = useState(false)
  const pausedUntilRef = useRef(0)

  const switchTab = useCallback((i: number) => {
    setFadingTab(true)
    setTimeout(() => { setFeatureTab(i); setTabProgress(0); setFadingTab(false) }, 180)
  }, [])

  useEffect(() => {
    const STEP_MS = 45
    const TOTAL_MS = 4500
    let elapsed = 0
    const id = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return
      elapsed += STEP_MS
      setTabProgress(Math.min(100, (elapsed / TOTAL_MS) * 100))
      if (elapsed >= TOTAL_MS) {
        elapsed = 0
        setFadingTab(true)
        setTimeout(() => {
          setFeatureTab(t => (t + 1) % CAROUSEL_COUNT)
          setTabProgress(0)
          setFadingTab(false)
        }, 180)
      }
    }, STEP_MS)
    return () => clearInterval(id)
  }, [])

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Lightweight client-side email validation — same rule as the rest of the app
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRe.test(contactForm.email.trim())) {
      setContactStatus('error')
      setContactError(lang === 'es' ? 'Por favor ingresa un email válido' : 'Please enter a valid email')
      return
    }
    setContactStatus('sending')
    setContactError('')
    try {
      const res  = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactForm) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setContactStatus('sent')
      setContactForm({ name: '', email: '', type: 'soporte', message: '' })
    } catch (err) {
      setContactStatus('error')
      setContactError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div style={{ background: '#06060d', color: '#fff', overflowX: 'hidden', fontFamily: F }}>
      <style suppressHydrationWarning>{`
        @keyframes twinkle { 0%,100%{opacity:.07} 50%{opacity:.5} }
        @keyframes floatOrb { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .glass { background:rgba(255,255,255,.042); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,.085); }
        .glass-strong { background:rgba(255,255,255,.06); backdrop-filter:blur(32px); -webkit-backdrop-filter:blur(32px); border:1px solid rgba(255,255,255,.1); }
        .amber-grad { background:linear-gradient(135deg,#fbbf24 0%,#fb923c 38%,#e879f9 72%,#818cf8 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .pill-cta { background:rgba(255,255,255,.95); color:#06060d; border-radius:9999px; font-weight:600; font-family:${F}; transition:all .25s ease; display:inline-flex; align-items:center; gap:7px; }
        .pill-cta:hover { background:#fff; transform:translateY(-2px); box-shadow:0 16px 48px rgba(251,191,36,.22); }
        .ghost-cta { color:rgba(255,255,255,.4); transition:color .2s; display:inline-flex; align-items:center; gap:8px; }
        .ghost-cta:hover { color:rgba(255,255,255,.8); }
        .nav-pill { background:rgba(255,255,255,.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,.09); border-radius:9999px; display:flex; align-items:center; padding:5px 8px; gap:2px; }
        .nav-link { padding:6px 14px; border-radius:9999px; font-size:.8rem; font-weight:400; color:rgba(255,255,255,.45); transition:all .2s; white-space:nowrap; }
        .nav-link:hover { color:rgba(255,255,255,.88); background:rgba(255,255,255,.07); }
        .step-num { font-size:clamp(4.5rem,10vw,7rem); font-weight:800; line-height:1; background:linear-gradient(180deg,rgba(255,255,255,.07) 0%,transparent 80%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; user-select:none; flex-shrink:0; }
        .check-dot::before { content:""; display:inline-block; width:6px; height:6px; border-radius:50%; background:rgba(251,191,36,.7); margin-right:10px; flex-shrink:0; }
        .code-block { background:#0d1117; border:1px solid rgba(255,255,255,.09); border-radius:1rem; overflow:hidden; }
        .terminal-bar { background:#161b22; padding:10px 16px; display:flex; align-items:center; gap:6px; border-bottom:1px solid rgba(255,255,255,.06); }
        .dot-r { width:10px; height:10px; border-radius:50%; background:#ff5f56; }
        .dot-y { width:10px; height:10px; border-radius:50%; background:#febc2e; }
        .dot-g { width:10px; height:10px; border-radius:50%; background:#27c93f; }
        pre { margin:0; padding:20px; font-size:.73rem; line-height:1.75; color:rgba(255,255,255,.65); overflow:auto; font-family:"Fira Code","Cascadia Code","Courier New",monospace; white-space:pre; }
        .kw { color:#ff79c6; } .str { color:#f1fa8c; } .cm { color:rgba(255,255,255,.3); } .at { color:#8be9fd; } .val { color:#bd93f9; }
        .section-label { font-size:.68rem; letter-spacing:.2em; text-transform:uppercase; color:rgba(251,191,36,.5); margin-bottom:.75rem; display:block; font-family:${F}; }
        .h2 { font-size:clamp(1.9rem,5vw,3rem); font-weight:200; letter-spacing:-.035em; line-height:1.2; font-family:${F}; }
        .body-text { color:rgba(255,255,255,.36); font-size:1rem; line-height:1.75; font-weight:300; font-family:${F}; }
        .divider { border:none; border-top:1px solid rgba(255,255,255,.055); margin:0; }
      `}</style>

      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {Array.from({ length: 80 }, (_, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 7) % 100}%`,
            width: i % 7 === 0 ? 2 : 1, height: i % 7 === 0 ? 2 : 1,
            animation: `twinkle ${2 + (i % 4)}s ${(i * .11) % 3}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 700, height: 700, background: 'radial-gradient(ellipse at 0% 0%,rgba(251,146,60,.07) 0%,transparent 55%)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 600, height: 600, background: 'radial-gradient(ellipse at 100% 100%,rgba(139,92,246,.07) 0%,transparent 55%)' }} />
      </div>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0" style={{ zIndex: 50 }}>
        <div className={`transition-all duration-500 ${scrolled ? 'py-2' : 'py-5'}`}
             style={scrolled ? { background: 'rgba(6,6,13,.9)', backdropFilter: 'blur(28px)', borderBottom: '1px solid rgba(255,255,255,.06)' } : undefined}>
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center" aria-label="PropSync inicio">
              <Image src="/logo-lockup.png" alt="PropSync" width={130} height={32} priority style={{ width: 'auto', height: 32, display: 'block' }} />
            </Link>
            <div className="nav-pill hidden md:flex">
              <a href="#platform" className="nav-link">{t.nav.platform}</a>
              <a href="#features" className="nav-link">{t.nav.marketing}</a>
              <a href="#features" className="nav-link">{t.nav.ai}</a>
              <a href="#pricing" className="nav-link">{t.nav.pricing}</a>
              <a href="#contact" className="nav-link">{t.nav.contact}</a>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleLang} className="text-xs px-3 py-1.5 rounded-full transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,.13)', color: 'rgba(255,255,255,.38)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.75)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.38)')}>
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
              <Link href="/login" className="text-sm px-4 py-2 rounded-full transition-colors"
                    style={{ color: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.13)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.9)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.3)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.55)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.13)' }}>
                {lang === 'es' ? 'Iniciar sesión' : 'Log in'}
              </Link>
              <Link href="/registro" className="pill-cta px-5 py-2 text-sm">
                {t.cta}
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 9.5L9.5 1.5M9.5 1.5H3.5M9.5 1.5V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-28 pb-0" style={{ minHeight: '100vh', zIndex: 10 }}>
        <div style={{ animation: 'fadeUp .65s .05s ease both', opacity: 0 }}>
          <span className="inline-flex items-center gap-2.5 text-xs px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', letterSpacing: '.02em' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
            {t.badge}
          </span>
        </div>
        <h1 style={{ marginTop: '1.75rem', fontSize: 'clamp(3.2rem,9vw,6.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.05, animation: 'fadeUp .65s .15s ease both', opacity: 0, fontFamily: F }}>
          {t.h1}
        </h1>
        <div style={{ marginTop: '.12em' }}>
          <h2 className="amber-grad" style={{ fontSize: 'clamp(3.2rem,9vw,6.5rem)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.05, fontFamily: F, opacity: cycleFade ? 1 : 0, transition: 'opacity .38s ease' }}>
            {t.cycle[cycleIdx]}
          </h2>
        </div>
        <p style={{ marginTop: '1.5rem', maxWidth: '520px', fontSize: '1rem', lineHeight: 1.78, color: 'rgba(255,255,255,.38)', animation: 'fadeUp .65s .35s ease both', opacity: 0, fontFamily: F, fontWeight: 300 }}>
          {t.sub}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4" style={{ marginTop: '2.5rem', animation: 'fadeUp .65s .5s ease both', opacity: 0 }}>
          <Link href="/registro" className="pill-cta px-8 py-3.5 text-sm">{t.cta}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 11.5L11.5 1.5M11.5 1.5H3.5M11.5 1.5V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
          <a href="#features" className="ghost-cta text-sm py-3.5">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="rgba(255,255,255,.22)" strokeWidth="1"/><path d="M8 7l6 3-6 3V7z" fill="rgba(255,255,255,.45)"/></svg>
            {t.demo}
          </a>
        </div>

        {/* Orb + cards */}
        <div className="relative w-full max-w-3xl mx-auto" style={{ marginTop: '2.5rem', height: 400 }}>
          <div className="absolute left-1/2" style={{ top: 0, transform: 'translateX(-50%)', width: 360, height: 360, animation: 'floatOrb 7s ease-in-out infinite', zIndex: 1 }}>
            <div style={{ position: 'absolute', inset: '-25%', borderRadius: '50%', background: 'radial-gradient(ellipse at 42% 48%,rgba(251,146,60,.14) 0%,rgba(139,92,246,.1) 50%,transparent 70%)', filter: 'blur(40px)' }} />
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(ellipse 32% 18% at 28% 24%,rgba(255,252,230,.95) 0%,rgba(251,191,36,.7) 40%,transparent 100%),radial-gradient(ellipse 48% 42% at 35% 38%,rgba(251,146,60,.9) 0%,rgba(239,68,68,.2) 55%,transparent 80%),radial-gradient(ellipse 62% 62% at 62% 60%,rgba(109,40,217,.8) 0%,rgba(67,20,120,.92) 44%,rgba(4,4,18,1) 74%),radial-gradient(circle at 50% 50%,transparent 38%,rgba(0,0,0,.97) 84%)', boxShadow: 'inset 0 0 100px rgba(0,0,0,.82),inset -60px -60px 180px rgba(0,0,0,.97),inset 8px 8px 40px rgba(255,255,255,.035),0 0 90px rgba(251,146,60,.1),0 0 180px rgba(109,40,217,.13)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(ellipse 15% 70% at 90% 50%,rgba(34,211,238,.2) 0%,transparent 60%)' }} />
          </div>
          <div className="glass absolute rounded-2xl p-5 hidden sm:block" style={{ left: 0, top: 70, zIndex: 10, width: 170 }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 200, letterSpacing: '-.04em', fontFamily: F }}>{t.stats[0].val}</div>
            <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.65)', fontWeight: 500, marginTop: 4 }}>{t.stats[0].label}</div>
            <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.28)', marginTop: 2 }}>{t.stats[0].sub}</div>
          </div>
          <div className="glass absolute rounded-2xl p-5 hidden sm:block" style={{ right: 0, top: 70, zIndex: 10, width: 170 }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 200, letterSpacing: '-.04em', fontFamily: F }}>{t.stats[1].val}</div>
            <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.65)', fontWeight: 500, marginTop: 4 }}>{t.stats[1].label}</div>
            <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.28)', marginTop: 2 }}>{t.stats[1].sub}</div>
          </div>
          <div className="glass absolute rounded-2xl px-5 py-3 flex items-center gap-3" style={{ left: '50%', transform: 'translateX(-50%)', bottom: 0, zIndex: 10, whiteSpace: 'nowrap' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" style={{ animation: 'pulse 2.5s ease-in-out infinite' }} />
            <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.45)', fontFamily: F }}>{t.stats[2].val} · {t.stats[2].label}</span>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{ height: 100, zIndex: 20, background: 'linear-gradient(to bottom,transparent,#06060d)' }} />
      </section>

      {/* ── Platform statement ─────────────────────────────────────────────── */}
      <section id="platform" className="px-6 py-12" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="rounded-3xl p-10 md:p-16" style={{ background: 'linear-gradient(135deg,rgba(251,146,60,.055) 0%,rgba(139,92,246,.055) 100%)', border: '1px solid rgba(255,255,255,.09)' }}>
              <span className="section-label">{t.platformBadge}</span>
              <h2 className="h2" style={{ maxWidth: 600, marginBottom: '1rem' }}>{t.platformTitle}</h2>
              <p className="body-text" style={{ maxWidth: 540, marginBottom: '2rem' }}>{t.platformSub}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {t.platformPills.map((pill, i) => (
                  <span key={i} style={{ padding: '5px 14px', borderRadius: 9999, fontSize: '.78rem', background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Feature carousel ──────────────────────────────────────────────── */}
      <section id="features" className="py-14 px-6" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' as const }}>
            {([
              lang === 'es' ? 'Marketing & Leads' : 'Marketing & Leads',
              lang === 'es' ? 'Asistente IA' : 'AI Assistant',
              lang === 'es' ? 'Tours 360°' : '360° Tours',
              'Web + API',
              'Add-ons',
            ] as string[]).map((label, i) => (
              <button key={i}
                onClick={() => { switchTab(i); pausedUntilRef.current = Date.now() + 12000 }}
                style={{ whiteSpace: 'nowrap', padding: '7px 18px', borderRadius: 9999, fontSize: '.78rem', fontFamily: F, border: 'none', cursor: 'pointer', background: featureTab === i ? 'rgba(251,191,36,.12)' : 'transparent', color: featureTab === i ? '#fde68a' : 'rgba(255,255,255,.35)', transition: 'all .2s', outline: 'none' }}>
                {label}
              </button>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginBottom: '2.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${tabProgress}%`, background: 'rgba(251,191,36,.6)', transition: 'width .045s linear' }} />
          </div>
          {/* Content */}
          <div style={{ opacity: fadingTab ? 0 : 1, transition: 'opacity .18s ease', minHeight: 360 }}>
            <div className="grid md:grid-cols-2 gap-10 items-center">
              {/* Left: text */}
              <div>
                {featureTab === 0 && (<>
                  <span className="section-label">{lang === 'es' ? 'Marketing & Leads' : 'Marketing & Leads'}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.mktTitle}</h2>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.mktSub}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {t.mktPoints.map((p, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.875rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: 'rgba(251,191,36,.7)', marginTop: 2, flexShrink: 0 }}>→</span>{p}
                      </li>
                    ))}
                  </ul>
                </>)}
                {featureTab === 1 && (<>
                  <span className="section-label">{lang === 'es' ? 'Asistente IA' : 'AI Assistant'}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.agentTitle}</h2>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1rem', padding: '4px 12px', borderRadius: 9999, background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.2)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(251,191,36,.7)', flexShrink: 0 }} />
                    <span style={{ fontSize: '.68rem', color: 'rgba(251,191,36,.7)', fontFamily: F, letterSpacing: '.05em' }}>{lang === 'es' ? 'WhatsApp requiere add-on · Contactar a Elevare' : 'WhatsApp requires add-on · Contact Elevare'}</span>
                  </div>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.agentSub}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {t.agentPoints.map((p, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.875rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: '#4ade80', marginTop: 2, flexShrink: 0, fontSize: '.7rem' }}>✓</span>{p}
                      </li>
                    ))}
                  </ul>
                </>)}
                {featureTab === 2 && (<>
                  <span className="section-label">{t.tourBadge}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.tourTitle}</h2>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.tourSub}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {t.tourPoints.map((p, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.875rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: 'rgba(251,191,36,.7)', marginTop: 2, flexShrink: 0 }}>→</span>{p}
                      </li>
                    ))}
                  </ul>
                </>)}
                {featureTab === 3 && (<>
                  <span className="section-label">{lang === 'es' ? 'Integraciones' : 'Integrations'}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.webApiTitle}</h2>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.webApiSub}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {t.apiFeatures.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.78rem', color: 'rgba(255,255,255,.4)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: 'rgba(129,140,248,.8)', flexShrink: 0 }}>—</span>{f}
                      </li>
                    ))}
                  </ul>
                </>)}
                {featureTab === 4 && (<>
                  <span className="section-label">{t.addonsBadge}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.addonsTitle}</h2>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.addonsSub}</p>
                  <p style={{ fontSize: '.73rem', color: 'rgba(255,255,255,.2)', fontFamily: F, marginTop: '.5rem' }}>{t.addonsNote}</p>
                </>)}
              </div>
              {/* Right: visual */}
              <div>
                {featureTab === 0 && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '-15%', background: 'radial-gradient(at 50% 40%,rgba(251,146,60,.07),transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', position: 'relative' }}>
                      {t.mktNoti.map((n, i) => (
                        <div key={i} className="glass rounded-2xl p-4 flex items-start gap-4">
                          <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 2 }}>{n.icon}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '.8rem', fontWeight: 500, color: 'rgba(255,255,255,.82)', marginBottom: 3, fontFamily: F }}>{n.title}</p>
                            <p style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F }}>{n.l1}</p>
                            <p style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.28)', fontFamily: F }}>{n.l2}</p>
                          </div>
                          <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.22)', flexShrink: 0, fontFamily: F }}>{lang === 'es' ? `hace ${n.time}` : `${n.time} ago`}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4, marginTop: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.25)', fontFamily: F }}>{lang === 'es' ? 'Actualizando en tiempo real' : 'Updating in real time'}</span>
                      </div>
                    </div>
                  </div>
                )}
                {featureTab === 1 && (
                  <div style={{ maxWidth: 310, margin: '0 auto', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '-20%', background: 'radial-gradient(at 50% 50%,rgba(74,222,128,.06),transparent 65%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
                    <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.12)', background: '#0c1520', position: 'relative' }}>
                      <div style={{ background: '#132030', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(251,146,60,.6),rgba(139,92,246,.6))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.95rem' }}>🤖</div>
                        <div>
                          <p style={{ fontSize: '.82rem', fontWeight: 500, color: 'rgba(255,255,255,.9)', fontFamily: F }}>{t.agentChat.header}</p>
                          <p style={{ fontSize: '.62rem', color: '#4ade80', fontFamily: F }}>{t.agentChat.online}</p>
                        </div>
                      </div>
                      <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div><div style={{ background: '#1a2d42', borderRadius: '2px 12px 12px 12px', padding: '9px 11px' }}>
                          <p style={{ fontSize: '.74rem', color: 'rgba(255,255,255,.78)', lineHeight: 1.55, fontFamily: F, fontWeight: 300 }}>{t.agentChat.msg1}</p>
                          <p style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.22)', textAlign: 'right', marginTop: 4, fontFamily: F }}>{t.agentChat.time1} ✓✓</p>
                        </div></div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <div style={{ background: '#1a4a2e', borderRadius: '12px 2px 12px 12px', padding: '9px 11px', maxWidth: '78%' }}>
                            <p style={{ fontSize: '.74rem', color: 'rgba(255,255,255,.82)', lineHeight: 1.55, fontFamily: F, fontWeight: 300 }}>{t.agentChat.reply}</p>
                            <p style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.22)', textAlign: 'right', marginTop: 4, fontFamily: F }}>{t.agentChat.time2} ✓✓</p>
                          </div>
                        </div>
                        <div style={{ background: 'rgba(74,222,128,.07)', border: '1px solid rgba(74,222,128,.18)', borderRadius: '2px 12px 12px 12px', padding: '9px 11px' }}>
                          {t.agentChat.updates.map((u, i) => (
                            <p key={i} style={{ fontSize: '.7rem', color: '#86efac', lineHeight: 1.7, fontFamily: F, fontWeight: 300 }}>✓ {u}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {featureTab === 2 && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '-15%', background: 'radial-gradient(at 50% 50%,rgba(139,92,246,.08),transparent 65%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
                    <div style={{ borderRadius: '1.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)', background: '#080e1a' }}>
                      <div style={{ height: 260, position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg,#0b1628 0%,#12243d 45%,#0a1520 100%)' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '160%', height: '52%', background: 'linear-gradient(to top,rgba(18,36,70,.95),rgba(10,20,45,.2))', clipPath: 'polygon(18% 100%,82% 100%,92% 0%,8% 0%)' }} />
                        <div style={{ position: 'absolute', top: 0, left: '8%', width: '84%', height: '62%', background: 'linear-gradient(to bottom,rgba(16,32,60,.9),rgba(12,24,48,.5))', clipPath: 'polygon(0% 100%,100% 100%,88% 0%,12% 0%)' }} />
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '20%', height: '100%', background: 'linear-gradient(to right,rgba(6,12,28,.95),rgba(10,20,45,.4))', clipPath: 'polygon(0% 0%,100% 18%,100% 82%,0% 100%)' }} />
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '20%', height: '100%', background: 'linear-gradient(to left,rgba(6,12,28,.95),rgba(10,20,45,.4))', clipPath: 'polygon(0% 18%,100% 0%,100% 100%,0% 82%)' }} />
                        <div style={{ position: 'absolute', top: '12%', right: '24%', width: 52, height: 72, background: 'rgba(251,191,36,.12)', boxShadow: '0 0 50px rgba(251,191,36,.15)', borderRadius: 3 }} />
                        <div style={{ position: 'absolute', bottom: '22%', left: '50%', transform: 'translateX(-50%)', width: 120, height: 28, background: 'rgba(20,40,80,.8)', borderRadius: '6px 6px 0 0', border: '1px solid rgba(255,255,255,.06)' }} />
                        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(10px)', borderRadius: 8, padding: '4px 10px', border: '1px solid rgba(255,255,255,.12)' }}>
                          <span style={{ fontSize: '.62rem', color: 'rgba(255,255,255,.7)', fontFamily: F, letterSpacing: '.08em' }}>360° · 3D</span>
                        </div>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6.5 4.5l8 4.5-8 4.5V4.5z" fill="rgba(255,255,255,.85)"/></svg>
                        </div>
                        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                          {[1,0,0,0].map((active, idx) => (
                            <span key={idx} style={{ width: active ? 16 : 5, height: 5, borderRadius: 9999, background: active ? 'rgba(251,191,36,.8)' : 'rgba(255,255,255,.2)' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,.07)' }}>
                        <span style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.45)', fontFamily: F }}>{t.tourLabel}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="rgba(255,255,255,.5)" strokeWidth="1"/><rect x="7" y="1" width="5" height="5" rx="1" stroke="rgba(255,255,255,.5)" strokeWidth="1"/><rect x="1" y="7" width="5" height="5" rx="1" stroke="rgba(255,255,255,.5)" strokeWidth="1"/><rect x="7" y="7" width="5" height="5" rx="1" stroke="rgba(255,255,255,.3)" strokeWidth="1" strokeDasharray="2 1"/></svg>
                          </div>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(251,191,36,.12)', border: '1px solid rgba(251,191,36,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" stroke="rgba(251,191,36,.9)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {featureTab === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="code-block">
                      <div className="terminal-bar"><span className="dot-r"/><span className="dot-y"/><span className="dot-g"/>
                        <span style={{ marginLeft: 8, fontSize: '.68rem', color: 'rgba(255,255,255,.28)', fontFamily: 'monospace' }}>index.html</span>
                      </div>
                      <pre>{`<span class="kw">&lt;script</span> <span class="at">src</span>=<span class="str">"https://cdn.propsync.io/v1/widget.js"</span><span class="kw">&gt;&lt;/script&gt;</span>\n<span class="kw">&lt;div</span> <span class="at">data-company</span>=<span class="str">"tu-agencia"</span> <span class="at">data-theme</span>=<span class="str">"dark"</span><span class="kw">&gt;&lt;/div&gt;</span>`}</pre>
                    </div>
                    <div className="code-block">
                      <div className="terminal-bar"><span className="dot-r"/><span className="dot-y"/><span className="dot-g"/>
                        <span style={{ marginLeft: 8, fontSize: '.68rem', color: 'rgba(255,255,255,.28)', fontFamily: 'monospace' }}>curl</span>
                      </div>
                      <pre>{`<span class="val">curl</span> https://api.propsync.io/v1/properties \\\n  -H <span class="str">"Authorization: Bearer {api_key}"</span> \\\n  -G -d <span class="str">"disponibilidad=disponible"</span>`}</pre>
                    </div>
                  </div>
                )}
                {featureTab === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {t.addons.map((addon, i) => (
                      <div key={i} className="glass rounded-2xl p-5" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '1.5rem' }}>{addon.icon}</span>
                          <span style={{ fontSize: '.6rem', letterSpacing: '.15em', textTransform: 'uppercase' as const, color: 'rgba(251,191,36,.7)', background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.2)', borderRadius: 9999, padding: '3px 10px', fontFamily: F, fontWeight: 600 }}>{addon.tag}</span>
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 400, letterSpacing: '-.015em', fontFamily: F }}>{addon.name}</h3>
                        <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.38)', lineHeight: 1.65, fontFamily: F, fontWeight: 300 }}>{addon.description}</p>
                        <a href="#contact" style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 9999, fontSize: '.76rem', fontWeight: 500, fontFamily: F, background: 'rgba(251,191,36,.1)', color: '#fde68a', border: '1px solid rgba(251,191,36,.25)', textDecoration: 'none' }}>{addon.cta} →</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 px-6" style={{ zIndex: 10, position: 'relative', background: 'rgba(255,255,255,.012)' }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <span className="section-label text-center block">{t.plansTitle}</span>
            <h2 className="h2 text-center mb-6">{t.plansSub}</h2>
            <div className="flex justify-center mb-10">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '10px 22px', borderRadius: 9999, background: 'linear-gradient(90deg,rgba(251,191,36,.13) 0%,rgba(232,121,249,.13) 50%,rgba(129,140,248,.13) 100%)', border: '1px solid rgba(251,191,36,.32)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
                <span className="amber-grad" style={{ fontSize: '.875rem', fontWeight: 600, letterSpacing: '-.005em', fontFamily: F }}>{t.trialBadge}</span>
                <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>· {t.trialSub}</span>
              </div>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5 items-start">
            {t.plans.map((plan, i) => (
              <Reveal key={i} delay={i * 70}>
                <div style={{ borderRadius: '1.5rem', padding: '1.875rem', display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform .3s ease', ...(plan.popular ? { background: 'rgba(251,191,36,.05)', border: '1px solid rgba(251,191,36,.28)' } : { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }) }}
                     onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-5px)')}
                     onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                  {plan.popular && <span style={{ fontSize: '.62rem', letterSpacing: '.16em', color: '#fbbf24', fontWeight: 600, display: 'block', marginBottom: '.75rem', textTransform: 'uppercase', fontFamily: F }}>Popular</span>}
                  <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.32)', marginBottom: '.35rem', fontFamily: F }}>{plan.d}</p>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 400, marginBottom: '1.25rem', fontFamily: F }}>{plan.n}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '2.75rem', fontWeight: 200, letterSpacing: '-.05em', fontFamily: F }}>{plan.p}</span>
                    <span style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.28)', fontFamily: F }}>{plan.per}</span>
                  </div>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', flex: 1, marginBottom: '1.5rem' }}>
                    {plan.f.map((feat, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem', fontSize: '.8rem', color: 'rgba(255,255,255,.42)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: 'rgba(251,191,36,.45)', flexShrink: 0, marginTop: 1 }}>—</span>{feat}
                      </li>
                    ))}
                  </ul>
                  {i === 2 ? (
                    <a href="#contact" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '.625rem 0', borderRadius: 9999, fontSize: '.8rem', fontWeight: 500, fontFamily: F, transition: 'all .2s', textDecoration: 'none', background: 'transparent', color: 'rgba(255,255,255,.42)', border: '1px solid rgba(255,255,255,.13)' }}>
                      {plan.cta}
                    </a>
                  ) : (
                    <Link href="/registro" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '.625rem 0', borderRadius: 9999, fontSize: '.8rem', fontWeight: 500, fontFamily: F, transition: 'all .2s', ...(plan.popular ? { background: 'rgba(251,191,36,.16)', color: '#fde68a', border: '1px solid rgba(251,191,36,.28)' } : { background: 'transparent', color: 'rgba(255,255,255,.42)', border: '1px solid rgba(255,255,255,.13)' }) }}>
                      {plan.cta}
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 text-center" style={{ zIndex: 10, position: 'relative', background: 'linear-gradient(180deg,transparent 0%,rgba(251,146,60,.03) 50%,transparent 100%)' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(2.4rem,7vw,4.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.1, fontFamily: F }}>{t.ctaBand}</h2>
          <p style={{ color: 'rgba(255,255,255,.28)', marginTop: '.75rem', fontSize: '.95rem', fontFamily: F, fontWeight: 300 }}>{t.ctaBandSub}</p>
          <Link href="/registro" className="pill-cta inline-flex mt-7 px-10 py-4" style={{ fontSize: '.9375rem' }}>
            {t.ctaBandBtn}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 11.5L11.5 1.5M11.5 1.5H3.5M11.5 1.5V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </Reveal>
      </section>

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <section id="contact" className="py-14 px-6" style={{ zIndex: 10, position: 'relative', background: 'rgba(255,255,255,.012)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-start">

            {/* Info */}
            <Reveal from="left">
              <span className="section-label">{lang === 'es' ? 'Contacto' : 'Contact'}</span>
              <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.contactTitle}</h2>
              <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.contactSub}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Phone */}
                <a href={`tel:${t.contactPhone.replace(/\s/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}
                   onMouseEnter={e => (e.currentTarget.style.opacity = '.75')}
                   onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.62 19.79 19.79 0 01.06 1.08 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.28)', fontFamily: F, marginBottom: 2 }}>{lang === 'es' ? 'Llámanos o WhatsApp' : 'Call or WhatsApp'}</p>
                    <p style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,.75)', fontFamily: F }}>{t.contactPhone}</p>
                  </div>
                </a>

                {/* Email */}
                <a href={`mailto:${t.contactEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}
                   onMouseEnter={e => (e.currentTarget.style.opacity = '.75')}
                   onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(129,140,248,.1)', border: '1px solid rgba(129,140,248,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.28)', fontFamily: F, marginBottom: 2 }}>{lang === 'es' ? 'Email' : 'Email'}</p>
                    <p style={{ fontSize: '.9rem', fontWeight: 400, color: 'rgba(255,255,255,.75)', fontFamily: F }}>{t.contactEmail}</p>
                  </div>
                </a>
              </div>
            </Reveal>

            {/* Form */}
            <Reveal from="right" delay={80}>
              <div className="glass rounded-3xl p-8">
                {contactStatus === 'sent' ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,.75)', fontFamily: F }}>{t.contactFields.sent}</p>
                    <button onClick={() => setContactStatus('idle')} style={{ marginTop: '1.5rem', fontSize: '.8rem', color: 'rgba(255,255,255,.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>
                      {lang === 'es' ? 'Enviar otro mensaje' : 'Send another message'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>{t.contactFields.name}</label>
                        <input
                          required
                          value={contactForm.name}
                          onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                          style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.8)', fontFamily: F, outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => (e.target.style.borderColor = 'rgba(251,191,36,.4)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>{t.contactFields.email}</label>
                        <input
                          required
                          type="email"
                          value={contactForm.email}
                          onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                          style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.8)', fontFamily: F, outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => (e.target.style.borderColor = 'rgba(251,191,36,.4)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>{t.contactFields.type}</label>
                      <select
                        value={contactForm.type}
                        onChange={e => setContactForm(f => ({ ...f, type: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.7)', fontFamily: F, outline: 'none', cursor: 'pointer' }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(251,191,36,.4)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                      >
                        {t.contactTypes.map(opt => (
                          <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#fff' }}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>{lang === 'es' ? 'Mensaje' : 'Message'}</label>
                      <textarea
                        required
                        rows={4}
                        value={contactForm.message}
                        onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                        placeholder={t.contactFields.message}
                        style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.8)', fontFamily: F, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(251,191,36,.4)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                      />
                    </div>

                    {contactStatus === 'error' && (
                      <p style={{ fontSize: '.78rem', color: '#f87171', fontFamily: F }}>{contactError || t.contactFields.error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={contactStatus === 'sending'}
                      className="pill-cta"
                      style={{ padding: '11px 0', justifyContent: 'center', fontSize: '.875rem', opacity: contactStatus === 'sending' ? .6 : 1 }}
                    >
                      {contactStatus === 'sending' ? t.contactFields.sending : t.contactFields.send}
                      {contactStatus !== 'sending' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="px-6 pt-16 pb-8" style={{ borderTop: '1px solid rgba(255,255,255,.055)', zIndex: 10, position: 'relative', background: 'linear-gradient(180deg,transparent 0%,rgba(255,255,255,.012) 100%)' }}>
        <div className="max-w-6xl mx-auto">

          {/* Footer CTA */}
          <div className="mb-14 text-center">
            <h3 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 200, letterSpacing: '-.03em', lineHeight: 1.2, fontFamily: F, marginBottom: '.5rem' }}>
              {lang === 'es' ? '¿Listo para activar tu inventario?' : 'Ready to activate your inventory?'}
            </h3>
            <p style={{ fontSize: '.875rem', color: 'rgba(255,255,255,.38)', fontFamily: F, fontWeight: 300, marginBottom: '1.75rem' }}>
              {lang === 'es' ? 'Empieza tu prueba gratuita de 15 días hoy mismo.' : 'Start your 15-day free trial today.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/registro" className="pill-cta px-7 py-3 text-sm">
                {lang === 'es' ? 'Crear cuenta gratis' : 'Create free account'}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </Link>
              <a href="#contact" className="px-7 py-3 text-sm rounded-full transition-colors" style={{ border: '1px solid rgba(255,255,255,.18)', color: 'rgba(255,255,255,.7)', fontFamily: F, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.4)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.7)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.18)' }}>
                {lang === 'es' ? 'Hablar con ventas' : 'Talk to sales'}
              </a>
            </div>
          </div>

          {/* Footer grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,.055)' }}>
            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="inline-flex items-center mb-3" aria-label="PropSync inicio">
                <Image src="/logo-lockup.png" alt="PropSync" width={140} height={36} style={{ width: 'auto', height: 36, display: 'block' }} />
              </Link>
              <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 300, lineHeight: 1.6, maxWidth: 240 }}>
                {t.footerTagline}
              </p>
            </div>

            {/* Producto */}
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>
                {lang === 'es' ? 'Producto' : 'Product'}
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><a href="#platform" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.platform}</a></li>
                <li><a href="#features" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.marketing}</a></li>
                <li><a href="#features" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.ai}</a></li>
                <li><a href="#pricing" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.pricing}</a></li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>
                {lang === 'es' ? 'Empresa' : 'Company'}
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><a href="#contact" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.contact}</a></li>
                <li><a href="https://elevarewebservices.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>Elevare</a></li>
              </ul>
            </div>

            {/* Cuenta */}
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>
                {lang === 'es' ? 'Cuenta' : 'Account'}
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><Link href="/registro" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.cta}</Link></li>
                <li><Link href="/login" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{lang === 'es' ? 'Iniciar sesión' : 'Log in'}</Link></li>
              </ul>
            </div>
          </div>

          {/* Footer bottom */}
          <div className="pt-7 flex flex-col md:flex-row items-center justify-between gap-3" style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.22)', fontFamily: F }}>
            <span>
              © {new Date().getFullYear()} PropSync · {lang === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
              {' · '}
              <Link href="/privacidad" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
                {lang === 'es' ? 'Privacidad' : 'Privacy'}
              </Link>
            </span>
            <span>{t.credit}{' '}
              <a href="https://elevarewebservices.com" target="_blank" rel="noopener noreferrer"
                 style={{ color: 'rgba(255,255,255,.55)', fontWeight: 500, letterSpacing: '.06em', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,.2)', paddingBottom: 1, transition: 'color .2s, border-color .2s' }}
                 onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.9)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.5)' }}
                 onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)' }}>
                Elevare
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
