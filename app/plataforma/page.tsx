'use client'

import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const F = 'var(--font-outfit), sans-serif'

const FEATURES = [
  {
    icon: '🗄️',
    title: 'Base de datos centralizada',
    description: 'Importa propiedades desde Wasi con un clic, sube manualmente o conecta tus fuentes. PropSync crea una base de datos única y estructurada de todo tu inventario.',
    points: ['Importación masiva desde Wasi API', 'Fichas completas con 50+ campos', 'Sin duplicados, siempre actualizada', 'Multi-empresa con aislamiento total'],
  },
  {
    icon: '📋',
    title: 'CRM nativo',
    description: 'Pipeline Kanban completo con etapas configurables, asignación de clientes, seguimiento, notas inmutables e historial detallado de cada lead.',
    points: ['Tablero Kanban con drag-and-drop', 'Etapas y tags personalizables', 'Notas inmutables append-only', 'Seguimientos con notificaciones'],
  },
  {
    icon: '🤖',
    title: 'Asistente IA',
    description: 'Inteligencia artificial integrada que redacta descripciones, responde consultas, analiza tu cartera y contacta propietarios automáticamente.',
    points: ['Descripciones generadas en segundos', 'Chat conversacional sobre tu cartera', 'Análisis de tendencias de mercado', 'Contacto automatizado a propietarios'],
  },
  {
    icon: '🏠',
    title: 'Tour virtual 360°',
    description: 'Sube fotos regulares o panorámicas 360° — PropSync genera un tour navegable que tus clientes pueden recorrer desde cualquier dispositivo.',
    points: ['Soporte fotos equirectangulares 360°', 'Animación Ken Burns para fotos regulares', 'Enlaces públicos compartibles', 'Código iframe para embeber'],
  },
  {
    icon: '🌐',
    title: 'Widget web + API REST',
    description: 'Inserta un buscador de propiedades en tu sitio web con dos líneas de código. API REST completa para integraciones avanzadas.',
    points: ['Widget responsive con tu branding', 'API REST con autenticación', 'Webhooks en tiempo real', 'SDK para JavaScript y Python'],
  },
  {
    icon: '📊',
    title: 'Reportes y análisis',
    description: 'Reportes de conversión, ROI por fuente de lead, performance de agentes y análisis detallado del pipeline de ventas.',
    points: ['Embudo de conversión lead → cierre', 'ROI por fuente (Meta, web, manual)', 'Performance individual por agente', 'Exportación CSV y Excel'],
  },
]

const INTEGRATIONS = [
  { name: 'Wasi', desc: 'Sincronización bidireccional de inventario' },
  { name: 'Meta Lead Ads', desc: 'Webhook para captura automática' },
  { name: 'WhatsApp Business', desc: 'Mensajería automatizada (add-on)' },
  { name: 'Facebook Pages', desc: 'Publicación automática (add-on)' },
  { name: 'Brevo', desc: 'Email transaccional y marketing' },
  { name: 'Stripe', desc: 'Procesamiento de pagos y suscripciones' },
]

export default function PlataformaPage() {
  return (
    <LandingShell>
      {/* Hero */}
      <section className="px-6 py-16 md:py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', letterSpacing: '.02em' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Plataforma integral
          </span>
          <h1 style={{ fontSize: 'clamp(2.4rem,7vw,4.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.05, fontFamily: F }}>
            Una sola plataforma <span className="amber-grad" style={{ fontWeight: 700 }}>para toda tu agencia.</span>
          </h1>
          <p style={{ marginTop: '1.5rem', maxWidth: 620, marginInline: 'auto', fontSize: '1.05rem', lineHeight: 1.75, color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300 }}>
            PropSync reemplaza tu hoja de Excel, tu CRM, tu redactor de descripciones y tu sistema de publicación. Todo en un solo lugar, conectado por inteligencia artificial.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link href="/registro" className="pill-cta px-7 py-3 text-sm">
              Probar 15 días gratis
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </Link>
            <Link href="/contacto" className="px-7 py-3 text-sm rounded-full" style={{ border: '1px solid rgba(255,255,255,.18)', color: 'rgba(255,255,255,.7)', fontFamily: F, fontWeight: 500 }}>
              Ver demo en vivo
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="section-label">Capacidades</span>
            <h2 className="h2" style={{ marginBottom: '.5rem' }}>Todo lo que tu agencia necesita</h2>
            <p className="body-text" style={{ maxWidth: 540, marginInline: 'auto' }}>Seis módulos integrados que trabajan juntos para automatizar tu operación de principio a fin.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass rounded-2xl p-7" style={{ animation: `fadeUp .6s ${i * .08}s ease both`, opacity: 0 }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 400, marginBottom: '.5rem', letterSpacing: '-.015em', fontFamily: F }}>{f.title}</h3>
                <p style={{ fontSize: '.875rem', color: 'rgba(255,255,255,.42)', lineHeight: 1.65, fontFamily: F, fontWeight: 300, marginBottom: '1rem' }}>{f.description}</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {f.points.map((p, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.8rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                      <span style={{ color: 'rgba(251,191,36,.7)', marginTop: 2, flexShrink: 0 }}>→</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-label">Integraciones</span>
            <h2 className="h2" style={{ marginBottom: '.5rem' }}>Conectado con tu stack</h2>
            <p className="body-text" style={{ maxWidth: 540, marginInline: 'auto' }}>PropSync se integra con las herramientas que ya usas.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {INTEGRATIONS.map((int, i) => (
              <div key={i} className="glass rounded-xl px-5 py-4">
                <p style={{ fontSize: '.95rem', fontWeight: 500, color: 'rgba(255,255,255,.85)', fontFamily: F, marginBottom: 4 }}>{int.name}</p>
                <p style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.4)', fontFamily: F, fontWeight: 300 }}>{int.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.15, fontFamily: F, marginBottom: '1rem' }}>
            Activa tu inventario en <span className="amber-grad" style={{ fontWeight: 700 }}>minutos.</span>
          </h2>
          <p className="body-text" style={{ marginBottom: '2rem', maxWidth: 480, marginInline: 'auto' }}>
            Crea tu cuenta gratis, importa tus propiedades y empieza a captar leads hoy mismo.
          </p>
          <Link href="/registro" className="pill-cta inline-flex px-9 py-3.5 text-sm">
            Comenzar prueba gratuita
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </div>
      </section>
    </LandingShell>
  )
}
