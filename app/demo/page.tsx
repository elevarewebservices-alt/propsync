'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { LandingShell } from '@/components/landing/LandingShell'

const F = 'var(--font-outfit), sans-serif'

// Screenshots live in public/demo/ and are produced by scripts/capture-demo.mjs
// against the seeded demo account. If one is missing the frame just shows the
// caption — the page never renders a broken image.
const STEPS = [
  {
    key: 'dashboard',
    label: '01 · Tablero',
    title: 'Todo tu negocio en una pantalla',
    body: 'Propiedades activas, leads nuevos, seguimientos del día y actividad reciente. Abres PropSync y sabes qué hacer primero.',
  },
  {
    key: 'propiedades',
    label: '02 · Inventario',
    title: 'Tu inventario, ordenado y listo para publicar',
    body: 'Fichas con fotos, precio, estado de publicación y disponibilidad. Eliges en qué portales sale cada propiedad y generas su ficha PDF o página pública en un clic.',
  },
  {
    key: 'crm',
    label: '03 · CRM',
    title: 'Cada cliente, en su etapa',
    body: 'Tablero Kanban de Nuevo lead a Cerrado, con notas, recordatorios de seguimiento y las propiedades que le interesan a cada contacto.',
  },
  {
    key: 'asistente',
    label: '04 · Asistente IA',
    title: 'Pregúntale a tu inventario',
    body: '"¿Qué apartamentos tengo en Costa del Este bajo $700 mil?" — el asistente busca, redacta descripciones y te dice a qué clientes ofrecerle cada propiedad.',
  },
]

function Shot({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true)
  return (
    <div style={{ borderRadius: '1rem', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', overflow: 'hidden', aspectRatio: '16 / 10' }}>
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" onError={() => setOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left', display: 'block' }} />
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.3)', fontFamily: F, fontSize: '.85rem' }}>
          {alt}
        </div>
      )}
    </div>
  )
}

function EnterDemoButton({ big = false }: { big?: boolean }) {
  return (
    <form action="/api/demo/login" method="post" style={{ display: 'inline' }}>
      <button type="submit" className="pill-cta text-sm" style={{ padding: big ? '.9rem 2rem' : '.6rem 1.25rem', cursor: 'pointer' }}>
        Entrar a la demo
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M1.5 11.5L11.5 1.5M11.5 1.5H3.5M11.5 1.5V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
      </button>
    </form>
  )
}

const ERRORS: Record<string, string> = {
  no_disponible: 'La demo no está disponible en este momento. Escríbenos y te la mostramos en vivo.',
  demasiados_intentos: 'Demasiados intentos seguidos. Espera unos minutos y vuelve a entrar.',
}

function ErrorNotice() {
  const error = useSearchParams().get('error')
  if (!error || !ERRORS[error]) return null
  return (
    <p style={{ marginTop: '1.25rem', fontSize: '.85rem', color: '#fca5a5', fontFamily: F }}>
      {ERRORS[error]}
    </p>
  )
}

export default function DemoPage() {
  return (
    <LandingShell>
      <section className="px-6 py-16 md:py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="section-label">Demo</span>
          <h1 style={{ fontSize: 'clamp(2.4rem,7vw,4.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.05, fontFamily: F }}>
            Pruébalo <span className="amber-grad" style={{ fontWeight: 700 }}>sin registrarte.</span>
          </h1>
          <p style={{ marginTop: '1.25rem', fontSize: '1.05rem', lineHeight: 1.75, color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300 }}>
            Entra a una inmobiliaria de ejemplo con propiedades y clientes de muestra.
            Crea, edita y mueve leads por el embudo — los datos se reinician cada día.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4" style={{ marginTop: '2rem' }}>
            <EnterDemoButton big />
            <Link href="/tour/demo" className="ghost-cta text-sm py-3.5">Ver tour virtual</Link>
          </div>
          <Suspense fallback={null}><ErrorNotice /></Suspense>
        </div>
      </section>

      {STEPS.map((s, i) => (
        <section key={s.key} className="px-6 py-12">
          <div className={`max-w-5xl mx-auto grid md:grid-cols-5 gap-8 items-center ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}>
            <div className="md:col-span-2">
              <span className="section-label">{s.label}</span>
              <h2 className="h2" style={{ marginBottom: '.75rem' }}>{s.title}</h2>
              <p style={{ fontSize: '.95rem', lineHeight: 1.7, color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300 }}>{s.body}</p>
            </div>
            <div className="md:col-span-3">
              <Shot src={`/demo/${s.key}.webp`} alt={s.title} />
            </div>
          </div>
        </section>
      ))}

      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-2">
            <span className="section-label">05 · Tour virtual</span>
            <h2 className="h2" style={{ marginBottom: '.75rem' }}>Muestra la propiedad antes de la visita</h2>
            <p style={{ fontSize: '.95rem', lineHeight: 1.7, color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300, marginBottom: '1.25rem' }}>
              Sube las fotos de cada espacio y PropSync arma un recorrido navegable, compatible con fotos 360°.
              Lo compartes por WhatsApp o lo insertas en tu sitio web.
            </p>
            <Link href="/tour/demo" className="ghost-cta text-sm py-3">Abrir el tour de ejemplo →</Link>
          </div>
          <div className="md:col-span-3">
            <Link href="/tour/demo" aria-label="Abrir tour virtual de ejemplo">
              <Shot src="/tour-demo/sala.webp" alt="Tour virtual de ejemplo" />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="h2" style={{ marginBottom: '1rem' }}>¿Te imaginas tu inventario aquí?</h2>
          <p style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300, marginBottom: '1.75rem' }}>
            Te ayudamos a migrar tus propiedades y contactos sin cargarlos uno por uno.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <EnterDemoButton />
            <Link href="/contacto" className="ghost-cta text-sm py-3">Hablar con nosotros</Link>
          </div>
        </div>
      </section>
    </LandingShell>
  )
}
