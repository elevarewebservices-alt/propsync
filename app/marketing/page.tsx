'use client'

import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const F = 'var(--font-outfit), sans-serif'

const CHANNELS = [
  {
    title: 'Widget web',
    desc: 'Buscador de propiedades que insertas en tu sitio con 2 líneas de código. Cada búsqueda captura el lead directamente en tu CRM.',
    metric: '2.4× más leads vs. formulario tradicional',
  },
  {
    title: 'Meta Lead Ads',
    desc: 'Webhook conectado directamente a Facebook/Instagram Lead Ads. Los leads llegan instantáneamente al pipeline.',
    metric: 'Captura en < 5 segundos',
  },
  {
    title: 'WhatsApp Business',
    desc: 'Mensajes automáticos a leads y propietarios. Plantillas pre-aprobadas + respuestas conversacionales con IA.',
    metric: '78% tasa de respuesta',
  },
  {
    title: 'Email automation',
    desc: 'Secuencias automáticas: bienvenida, propiedades sugeridas según preferencias, recordatorios de seguimiento.',
    metric: 'Sin límites de envío',
  },
]

const FUNNEL = [
  { stage: '1', label: 'Captura', items: ['Widget web · Meta Ads · WhatsApp', 'Lead llega al CRM con fuente y UTM', 'Asignación automática al agente'] },
  { stage: '2', label: 'Nutrición', items: ['Secuencia de email automática', 'Alertas de nuevas propiedades match', 'Score de interés calculado por IA'] },
  { stage: '3', label: 'Contacto', items: ['Notificación al agente en tiempo real', 'Plantillas WhatsApp pre-cargadas', 'Llamada con notas inmutables'] },
  { stage: '4', label: 'Cierre', items: ['Pipeline Kanban con etapas', 'Recordatorios de seguimiento', 'Reporte ROI por fuente'] },
]

export default function MarketingPage() {
  return (
    <LandingShell>
      {/* Hero */}
      <section className="px-6 py-16 md:py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', letterSpacing: '.02em' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Marketing & Leads
          </span>
          <h1 style={{ fontSize: 'clamp(2.4rem,7vw,4.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.05, fontFamily: F }}>
            Captura y nutre <span className="amber-grad" style={{ fontWeight: 700 }}>cada lead automáticamente.</span>
          </h1>
          <p style={{ marginTop: '1.5rem', maxWidth: 620, marginInline: 'auto', fontSize: '1.05rem', lineHeight: 1.75, color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300 }}>
            Tu sitio web, Meta Ads y WhatsApp llenan tu CRM en tiempo real. PropSync nutre cada lead con secuencias automáticas hasta el cierre.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link href="/registro" className="pill-cta px-7 py-3 text-sm">
              Probar 15 días gratis
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </Link>
            <Link href="/contacto" className="px-7 py-3 text-sm rounded-full" style={{ border: '1px solid rgba(255,255,255,.18)', color: 'rgba(255,255,255,.7)', fontFamily: F, fontWeight: 500 }}>
              Hablar con ventas
            </Link>
          </div>
        </div>
      </section>

      {/* Channels */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="section-label">Canales</span>
            <h2 className="h2" style={{ marginBottom: '.5rem' }}>Captura desde todos lados</h2>
            <p className="body-text" style={{ maxWidth: 540, marginInline: 'auto' }}>Cuatro fuentes de leads conectadas directamente al pipeline de tu CRM.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {CHANNELS.map((c, i) => (
              <div key={i} className="glass rounded-2xl p-7">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '.75rem', fontFamily: F, letterSpacing: '-.015em' }}>{c.title}</h3>
                <p style={{ fontSize: '.875rem', color: 'rgba(255,255,255,.45)', lineHeight: 1.65, fontFamily: F, fontWeight: 300, marginBottom: '1rem' }}>{c.desc}</p>
                <span className="amber-grad" style={{ fontSize: '.85rem', fontWeight: 600, fontFamily: F }}>{c.metric}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funnel */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="section-label">Embudo automatizado</span>
            <h2 className="h2" style={{ marginBottom: '.5rem' }}>De click a cierre, sin intervención manual</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {FUNNEL.map((stage, i) => (
              <div key={i} className="glass rounded-2xl p-6">
                <div className="amber-grad" style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1, fontFamily: F, marginBottom: '.5rem' }}>{stage.stage}</div>
                <p style={{ fontSize: '.7rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 600, marginBottom: '1rem' }}>{stage.label}</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {stage.items.map((item, j) => (
                    <li key={j} style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300, lineHeight: 1.55 }}>· {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live activity demo */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="section-label">En tiempo real</span>
              <h2 className="h2" style={{ marginBottom: '1rem' }}>Actividad en vivo</h2>
              <p className="body-text" style={{ marginBottom: '1.5rem' }}>
                Mientras duermes, PropSync captura leads, envía mensajes y actualiza disponibilidad. Cada acción queda registrada con timestamp y agente responsable.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                {['Notificaciones push al agente asignado', 'Bitácora completa por lead', 'Métricas en vivo en dashboard', 'Alertas de leads sin contacto > 24h'].map((p, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.875rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                    <span style={{ color: '#4ade80', marginTop: 2, flexShrink: 0 }}>✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[
                { icon: '🟢', t: 'Lead capturado', l1: 'María García · maria@gmail.com', l2: 'Interesada: Apto Punta Pacífica', time: '2 min' },
                { icon: '📱', t: 'WhatsApp enviado', l1: 'José Rodríguez · propietario', l2: 'Verificación de disponibilidad', time: '5 min' },
                { icon: '✅', t: 'Disponibilidad confirmada', l1: 'Casa Costa del Este · #B-1823', l2: 'Estado actualizado', time: '8 min' },
              ].map((n, i) => (
                <div key={i} className="glass rounded-2xl p-4 flex items-start gap-4">
                  <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 2 }}>{n.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '.8rem', fontWeight: 500, color: 'rgba(255,255,255,.82)', marginBottom: 3, fontFamily: F }}>{n.t}</p>
                    <p style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F }}>{n.l1}</p>
                    <p style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.28)', fontFamily: F }}>{n.l2}</p>
                  </div>
                  <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.22)', flexShrink: 0, fontFamily: F }}>hace {n.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.15, fontFamily: F, marginBottom: '1rem' }}>
            Empieza a captar leads <span className="amber-grad" style={{ fontWeight: 700 }}>desde hoy.</span>
          </h2>
          <Link href="/registro" className="pill-cta inline-flex px-9 py-3.5 text-sm mt-4">
            Crear cuenta gratis
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </div>
      </section>
    </LandingShell>
  )
}
