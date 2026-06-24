'use client'

import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const F = 'var(--font-outfit), sans-serif'

const PLANS = [
  {
    name: 'Individual',
    price: '$30',
    per: '/mes',
    desc: 'Para agentes independientes que arrancan',
    features: [
      '50 propiedades',
      'Base de datos centralizada',
      'CRM básico (Kanban)',
      'Asistente IA limitado',
      'Widget web',
      '1 usuario',
      'Soporte por email',
    ],
    cta: 'Probar 15 días gratis',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$60',
    per: '/mes',
    desc: 'Para equipos que están creciendo',
    features: [
      'Propiedades ilimitadas',
      'CRM completo + pipeline configurable',
      'Asistente IA completo',
      'Conexión a portales',
      'API REST de integración',
      '2 usuarios (+$7.99/usuario adicional)',
      'Reportes ROI por fuente',
      'Soporte por email',
    ],
    cta: 'Probar 15 días gratis',
    popular: true,
  },
]

const FAQ = [
  {
    q: '¿Qué incluye la prueba de 15 días?',
    a: 'Acceso completo al plan Pro: CRM, IA, marketing automation, widget web y API. Sin tarjeta de crédito requerida. Al finalizar puedes elegir el plan que mejor se adapte.',
  },
  {
    q: '¿Puedo cambiar de plan más adelante?',
    a: 'Sí, puedes subir o bajar de plan en cualquier momento. Los cambios se aplican al siguiente ciclo de facturación y se prorratea el monto.',
  },
  {
    q: '¿Cómo funciona el límite de propiedades?',
    a: 'El límite es de propiedades activas en tu inventario. Las propiedades vendidas o archivadas no cuentan. Si superas el límite, se te avisa con anticipación.',
  },
  {
    q: '¿Hay costos ocultos?',
    a: 'No. El precio incluye todo lo que ves listado. Los add-ons (WhatsApp Business, publicación Facebook) son opcionales y se cotizan según configuración.',
  },
  {
    q: '¿Aceptan facturación a empresa?',
    a: 'Sí, emitimos factura fiscal según los requisitos de Panamá. Contáctanos para coordinar el alta como empresa.',
  },
  {
    q: '¿Qué pasa con mis datos si cancelo?',
    a: 'Tus datos quedan disponibles 30 días después de cancelar. Puedes exportar todo a CSV/Excel en cualquier momento desde la configuración.',
  },
]

export default function PreciosPage() {
  return (
    <LandingShell>
      {/* Hero */}
      <section className="px-6 py-16 md:py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2.5 mb-6 px-4 py-2 rounded-full" style={{ background: 'linear-gradient(90deg,rgba(251,191,36,.13) 0%,rgba(232,121,249,.13) 50%,rgba(129,140,248,.13) 100%)', border: '1px solid rgba(251,191,36,.32)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', animation: 'pulse 2s ease-in-out infinite' }} />
            <span className="amber-grad" style={{ fontSize: '.875rem', fontWeight: 600, fontFamily: F }}>15 días de prueba gratis</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem,7vw,4.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.05, fontFamily: F }}>
            Precios <span className="amber-grad" style={{ fontWeight: 700 }}>transparentes.</span>
          </h1>
          <p style={{ marginTop: '1.25rem', fontSize: '1.05rem', lineHeight: 1.75, color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300 }}>
            Sin tarjeta de crédito · Sin compromiso · Cancela cuando quieras.
          </p>
        </div>
      </section>

      {/* Pricing grid */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-5 items-start">
            {PLANS.map((plan, i) => (
              <div key={i} style={{ borderRadius: '1.5rem', padding: '1.875rem', display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform .3s ease', ...(plan.popular ? { background: 'rgba(251,191,36,.05)', border: '1px solid rgba(251,191,36,.28)' } : { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }) }}>
                {plan.popular && <span style={{ fontSize: '.62rem', letterSpacing: '.16em', color: '#fbbf24', fontWeight: 600, display: 'block', marginBottom: '.75rem', textTransform: 'uppercase', fontFamily: F }}>Popular</span>}
                <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.32)', marginBottom: '.35rem', fontFamily: F }}>{plan.desc}</p>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 400, marginBottom: '1.25rem', fontFamily: F }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 200, letterSpacing: '-.05em', fontFamily: F }}>{plan.price}</span>
                  <span style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.28)', fontFamily: F }}>{plan.per}</span>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', flex: 1, marginBottom: '1.5rem' }}>
                  {plan.features.map((feat, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem', fontSize: '.8rem', color: 'rgba(255,255,255,.42)', fontFamily: F, fontWeight: 300 }}>
                      <span style={{ color: 'rgba(251,191,36,.45)', flexShrink: 0, marginTop: 1 }}>—</span>{feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.cta === 'Hablar con ventas' ? '/contacto' : '/registro'}
                  style={{ display: 'block', width: '100%', textAlign: 'center', padding: '.625rem 0', borderRadius: 9999, fontSize: '.8rem', fontWeight: 500, fontFamily: F, transition: 'all .2s', ...(plan.popular ? { background: 'rgba(251,191,36,.16)', color: '#fde68a', border: '1px solid rgba(251,191,36,.28)' } : { background: 'transparent', color: 'rgba(255,255,255,.42)', border: '1px solid rgba(255,255,255,.13)' }) }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trial details */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-8 md:p-12">
            <h2 className="h2" style={{ marginBottom: '1rem' }}>¿Cómo funciona la prueba de 15 días?</h2>
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {[
                { n: '01', t: 'Crea tu cuenta', d: 'Sin tarjeta de crédito. Solo email y contraseña. Listo en menos de 1 minuto.' },
                { n: '02', t: 'Acceso al plan Pro', d: 'Durante 15 días tienes acceso completo a todas las funciones del plan Pro.' },
                { n: '03', t: 'Elige tu plan', d: 'Al día 15 eliges el plan que mejor se adapta. Si no haces nada, tu cuenta se pausa sin cargo.' },
              ].map((step, i) => (
                <div key={i}>
                  <div className="amber-grad" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1, fontFamily: F, marginBottom: '.75rem' }}>{step.n}</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '.4rem', fontFamily: F }}>{step.t}</h3>
                  <p style={{ fontSize: '.825rem', color: 'rgba(255,255,255,.42)', fontFamily: F, fontWeight: 300, lineHeight: 1.6 }}>{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-label">Preguntas frecuentes</span>
            <h2 className="h2">Todo lo que necesitas saber</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {FAQ.map((item, i) => (
              <details key={i} className="glass rounded-xl" style={{ overflow: 'hidden' }}>
                <summary style={{ padding: '1.1rem 1.25rem', cursor: 'pointer', fontSize: '.95rem', color: 'rgba(255,255,255,.82)', fontFamily: F, fontWeight: 500, listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {item.q}
                  <span style={{ color: 'rgba(251,191,36,.6)', fontSize: '1.2rem', fontWeight: 200, fontFamily: F }}>+</span>
                </summary>
                <p style={{ padding: '0 1.25rem 1.1rem', fontSize: '.875rem', color: 'rgba(255,255,255,.5)', lineHeight: 1.65, fontFamily: F, fontWeight: 300 }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.15, fontFamily: F, marginBottom: '1rem' }}>
            Empieza tus <span className="amber-grad" style={{ fontWeight: 700 }}>15 días gratis</span> hoy.
          </h2>
          <p className="body-text" style={{ marginBottom: '2rem', maxWidth: 460, marginInline: 'auto' }}>
            Sin tarjeta de crédito. Sin compromiso. Sin sorpresas.
          </p>
          <Link href="/registro" className="pill-cta inline-flex px-9 py-3.5 text-sm">
            Crear cuenta gratis
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </div>
      </section>
    </LandingShell>
  )
}
