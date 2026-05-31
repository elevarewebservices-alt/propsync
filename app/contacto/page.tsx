'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const F = 'var(--font-outfit), sans-serif'

const CONTACT_TYPES = [
  { value: 'soporte', label: 'Soporte técnico' },
  { value: 'ventas',  label: 'Consulta de ventas' },
  { value: 'demo',    label: 'Agendar demo' },
  { value: 'otro',    label: 'Otra consulta' },
]

export default function ContactoPage() {
  const [form, setForm] = useState({ name: '', email: '', type: 'ventas', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRe.test(form.email.trim())) {
      setStatus('error')
      setError('Por favor ingresa un email válido')
      return
    }
    setStatus('sending')
    setError('')
    try {
      const res  = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setStatus('sent')
      setForm({ name: '', email: '', type: 'ventas', message: '' })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <LandingShell>
      {/* Hero */}
      <section className="px-6 py-16 md:py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', letterSpacing: '.02em' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Contacto
          </span>
          <h1 style={{ fontSize: 'clamp(2.4rem,7vw,4.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.05, fontFamily: F }}>
            Hablemos de tu <span className="amber-grad" style={{ fontWeight: 700 }}>agencia.</span>
          </h1>
          <p style={{ marginTop: '1.25rem', fontSize: '1.05rem', lineHeight: 1.75, color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300 }}>
            Nuestro equipo está listo para ayudarte. Escríbenos, llámanos o agenda una demo personalizada.
          </p>
        </div>
      </section>

      {/* Contact grid */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-start">

            {/* Info */}
            <div>
              <h2 className="h2" style={{ marginBottom: '1.5rem' }}>Canales directos</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <a href="tel:+50765139139" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.62 19.79 19.79 0 01.06 1.08 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.32)', fontFamily: F, marginBottom: 2 }}>Llámanos o WhatsApp</p>
                    <p style={{ fontSize: '1.05rem', fontWeight: 400, color: 'rgba(255,255,255,.85)', fontFamily: F }}>+507 6513-9139</p>
                  </div>
                </a>

                <a href="mailto:gerencia@elevarewebservices.com" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(129,140,248,.1)', border: '1px solid rgba(129,140,248,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.32)', fontFamily: F, marginBottom: 2 }}>Email</p>
                    <p style={{ fontSize: '.95rem', fontWeight: 400, color: 'rgba(255,255,255,.85)', fontFamily: F }}>gerencia@elevarewebservices.com</p>
                  </div>
                </a>

                <a href="https://elevarewebservices.com" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(232,121,249,.1)', border: '1px solid rgba(232,121,249,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(232,121,249,.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.32)', fontFamily: F, marginBottom: 2 }}>Sitio Elevare</p>
                    <p style={{ fontSize: '.95rem', fontWeight: 400, color: 'rgba(255,255,255,.85)', fontFamily: F }}>elevarewebservices.com</p>
                  </div>
                </a>
              </div>

              <div className="mt-10 glass rounded-2xl p-5">
                <p style={{ fontSize: '.78rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(251,191,36,.6)', fontFamily: F, fontWeight: 600, marginBottom: '.6rem' }}>Horario</p>
                <p style={{ fontSize: '.875rem', color: 'rgba(255,255,255,.65)', fontFamily: F, fontWeight: 300, lineHeight: 1.7 }}>
                  Lunes a Viernes · 9:00 AM – 6:00 PM<br />
                  Sábados · 9:00 AM – 1:00 PM<br />
                  <span style={{ color: 'rgba(255,255,255,.35)', fontSize: '.78rem' }}>Hora de Panamá (GMT-5)</span>
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="glass rounded-3xl p-8">
              {status === 'sent' ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,.82)', fontFamily: F, marginBottom: '.5rem' }}>¡Mensaje enviado!</p>
                  <p style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.4)', fontFamily: F, fontWeight: 300 }}>Te contactaremos en menos de 24 horas.</p>
                  <button onClick={() => setStatus('idle')} style={{ marginTop: '1.5rem', fontSize: '.8rem', color: 'rgba(251,191,36,.7)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>Tu nombre</label>
                      <input
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.8)', fontFamily: F, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>Tu email</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.8)', fontFamily: F, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>Tipo de consulta</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.7)', fontFamily: F, outline: 'none', cursor: 'pointer' }}
                    >
                      {CONTACT_TYPES.map(opt => (
                        <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#fff' }}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>Mensaje</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Cuéntanos en qué podemos ayudarte..."
                      style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.8)', fontFamily: F, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>

                  {status === 'error' && (
                    <p style={{ fontSize: '.78rem', color: '#f87171', fontFamily: F }}>{error || 'No se pudo enviar.'}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="pill-cta"
                    style={{ padding: '11px 0', justifyContent: 'center', fontSize: '.9rem', opacity: status === 'sending' ? .6 : 1 }}
                  >
                    {status === 'sending' ? 'Enviando...' : 'Enviar mensaje'}
                    {status !== 'sending' && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick CTA */}
      <section className="px-6 py-14 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="body-text" style={{ marginBottom: '1.25rem' }}>¿Prefieres explorar por tu cuenta?</p>
          <Link href="/registro" className="pill-cta inline-flex px-8 py-3 text-sm">
            Crear cuenta gratis · 15 días
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </div>
      </section>
    </LandingShell>
  )
}
