'use client'

import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const F = 'var(--font-outfit), sans-serif'

const CAPABILITIES = [
  {
    icon: '✍️',
    title: 'Descripciones automáticas',
    desc: 'Genera descripciones profesionales en español, en 3 párrafos, optimizadas para SEO. Plantilla configurable por agencia.',
  },
  {
    icon: '💬',
    title: 'Chat conversacional',
    desc: 'Pregúntale a la IA sobre tu cartera: "¿Cuántos apartamentos de 3 habitaciones tengo en Costa del Este?". Responde en segundos.',
  },
  {
    icon: '📞',
    title: 'Contacto a propietarios',
    desc: 'WhatsApp automatizado para verificar disponibilidad. La IA procesa respuestas y actualiza el estado en tu base de datos.',
  },
  {
    icon: '🔍',
    title: 'Detección de inactividad',
    desc: 'Identifica propiedades sin movimiento durante X días y sugiere acciones: reducir precio, refrescar fotos, republicar.',
  },
  {
    icon: '📈',
    title: 'Análisis de tendencias',
    desc: 'Detecta patrones en tu mercado: precios por zona, tiempo promedio de venta, demanda por tipo de inmueble.',
  },
  {
    icon: '🎯',
    title: 'Match lead-propiedad',
    desc: 'La IA puntúa cada lead contra tu inventario y sugiere las propiedades con mayor probabilidad de cierre.',
  },
]

export default function IAPage() {
  return (
    <LandingShell>
      {/* Hero */}
      <section className="px-6 py-16 md:py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', letterSpacing: '.02em' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Inteligencia artificial
          </span>
          <h1 style={{ fontSize: 'clamp(2.4rem,7vw,4.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.05, fontFamily: F }}>
            El agente que <span className="amber-grad" style={{ fontWeight: 700 }}>nunca duerme.</span>
          </h1>
          <p style={{ marginTop: '1.5rem', maxWidth: 620, marginInline: 'auto', fontSize: '1.05rem', lineHeight: 1.75, color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300 }}>
            Una IA que entiende tu cartera, conversa con tus clientes, contacta propietarios y mantiene tu inventario actualizado sin que tú levantes un dedo.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link href="/registro" className="pill-cta px-7 py-3 text-sm">
              Probar 15 días gratis
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </Link>
            <Link href="/contacto" className="px-7 py-3 text-sm rounded-full" style={{ border: '1px solid rgba(255,255,255,.18)', color: 'rgba(255,255,255,.7)', fontFamily: F, fontWeight: 500 }}>
              Ver demo
            </Link>
          </div>
        </div>
      </section>

      {/* Capabilities grid */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="section-label">Capacidades</span>
            <h2 className="h2" style={{ marginBottom: '.5rem' }}>6 superpoderes para tu agencia</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {CAPABILITIES.map((c, i) => (
              <div key={i} className="glass rounded-2xl p-6">
                <div style={{ fontSize: '1.6rem', marginBottom: '.75rem' }}>{c.icon}</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '.5rem', fontFamily: F, letterSpacing: '-.015em' }}>{c.title}</h3>
                <p style={{ fontSize: '.825rem', color: 'rgba(255,255,255,.42)', lineHeight: 1.65, fontFamily: F, fontWeight: 300 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chat demo */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="section-label">En acción</span>
              <h2 className="h2" style={{ marginBottom: '1rem' }}>Verifica disponibilidad sin levantar el teléfono</h2>
              <p className="body-text" style={{ marginBottom: '1.5rem' }}>
                La IA contacta al propietario por WhatsApp, procesa la respuesta en lenguaje natural y actualiza tu base de datos. Todo en menos de 5 minutos.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.2)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(251,191,36,.7)' }} />
                <span style={{ fontSize: '.7rem', color: 'rgba(251,191,36,.85)', fontFamily: F, letterSpacing: '.05em' }}>WhatsApp requiere add-on · Contactar a Elevare</span>
              </div>
            </div>
            <div style={{ maxWidth: 360, marginInline: 'auto', width: '100%' }}>
              <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.12)', background: '#0c1520' }}>
                <div style={{ background: '#132030', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(251,146,60,.6),rgba(139,92,246,.6))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.95rem' }}>🤖</div>
                  <div>
                    <p style={{ fontSize: '.82rem', fontWeight: 500, color: 'rgba(255,255,255,.9)', fontFamily: F }}>PropSync IA</p>
                    <p style={{ fontSize: '.62rem', color: '#4ade80', fontFamily: F }}>en línea</p>
                  </div>
                </div>
                <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: '#1a2d42', borderRadius: '2px 12px 12px 12px', padding: '10px 12px' }}>
                    <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.78)', lineHeight: 1.55, fontFamily: F, fontWeight: 300 }}>Hola José! Soy el asistente de Inmobiliaria Las Palmas. Tu propiedad en Punta Pacífica (#A-2341) — ¿sigue disponible para visitas? 🏠</p>
                    <p style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.22)', textAlign: 'right', marginTop: 4, fontFamily: F }}>13:42 ✓✓</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ background: '#1a4a2e', borderRadius: '12px 2px 12px 12px', padding: '10px 12px', maxWidth: '78%' }}>
                      <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.82)', lineHeight: 1.55, fontFamily: F, fontWeight: 300 }}>Sí, disponible. Pueden visitar martes y jueves 👍</p>
                      <p style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.22)', textAlign: 'right', marginTop: 4, fontFamily: F }}>13:45 ✓✓</p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(74,222,128,.07)', border: '1px solid rgba(74,222,128,.18)', borderRadius: '2px 12px 12px 12px', padding: '10px 12px' }}>
                    {['Propiedad #A-2341 → Disponible', 'Base de datos actualizada', '3 interesados notificados', 'Visitas: mar. y jue. agendadas'].map((u, i) => (
                      <p key={i} style={{ fontSize: '.74rem', color: '#86efac', lineHeight: 1.7, fontFamily: F, fontWeight: 300 }}>✓ {u}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Model info */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-8 md:p-12">
            <span className="section-label">Tecnología</span>
            <h2 className="h2" style={{ marginBottom: '1rem' }}>Construido con Claude por Anthropic</h2>
            <p className="body-text" style={{ marginBottom: '1.5rem' }}>
              PropSync usa los modelos Claude más recientes para todas sus tareas de IA. Razonamiento avanzado, español nativo, y velocidad optimizada por tarea.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,.025)' }}>
                <p style={{ fontSize: '.7rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(251,191,36,.7)', fontFamily: F, fontWeight: 600, marginBottom: 6 }}>Claude Haiku</p>
                <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300, lineHeight: 1.55 }}>Descripciones, respuestas rápidas y procesamiento de respuestas de WhatsApp.</p>
              </div>
              <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,.025)' }}>
                <p style={{ fontSize: '.7rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(232,121,249,.7)', fontFamily: F, fontWeight: 600, marginBottom: 6 }}>Claude Sonnet</p>
                <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300, lineHeight: 1.55 }}>Análisis de tendencias, chat conversacional y razonamiento complejo sobre tu cartera.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.15, fontFamily: F, marginBottom: '1rem' }}>
            Suma IA a tu agencia <span className="amber-grad" style={{ fontWeight: 700 }}>hoy mismo.</span>
          </h2>
          <Link href="/registro" className="pill-cta inline-flex px-9 py-3.5 text-sm mt-4">
            Probar gratis 15 días
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </div>
      </section>
    </LandingShell>
  )
}
