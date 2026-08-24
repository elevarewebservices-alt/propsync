'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const F = 'var(--font-outfit), sans-serif'

type Lang = 'es' | 'en'

const NAV = {
  es: { platform: 'Plataforma', marketing: 'Marketing', ai: 'IA', pricing: 'Precios', contact: 'Contacto', login: 'Iniciar sesión', cta: 'Comenzar gratis' },
  en: { platform: 'Platform', marketing: 'Marketing', ai: 'AI', pricing: 'Pricing', contact: 'Contact', login: 'Log in', cta: 'Start for free' },
}

const FOOTER = {
  es: {
    ctaTitle: '¿Listo para activar tu inventario?',
    ctaSub: 'Empieza tu prueba gratuita de 15 días hoy mismo.',
    ctaPrimary: 'Crear cuenta gratis',
    ctaSecondary: 'Hablar con ventas',
    tagline: 'Marketing · CRM · IA para inmobiliarias.',
    product: 'Producto',
    company: 'Empresa',
    account: 'Cuenta',
    rights: 'Todos los derechos reservados.',
    credit: 'Creado por',
    register: 'Comenzar gratis',
  },
  en: {
    ctaTitle: 'Ready to activate your inventory?',
    ctaSub: 'Start your 15-day free trial today.',
    ctaPrimary: 'Create free account',
    ctaSecondary: 'Talk to sales',
    tagline: 'Marketing · CRM · AI for real estate.',
    product: 'Product',
    company: 'Company',
    account: 'Account',
    rights: 'All rights reserved.',
    credit: 'Created by',
    register: 'Start for free',
  },
}

export function LandingShell({ children, lang: initialLang = 'es' }: { children: React.ReactNode; lang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const toggleLang = useCallback(() => setLang(l => (l === 'es' ? 'en' : 'es')), [])
  const t = NAV[lang]
  const f = FOOTER[lang]

  return (
    <div className="ml" style={{ overflowX: 'hidden', fontFamily: F, minHeight: '100vh' }}>
      <style suppressHydrationWarning>{`
        @keyframes pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
        .ml {
          --ml-bg: oklch(0.145 0 0);
          --ml-fg: oklch(0.985 0 0);
          --ml-muted: oklch(0.708 0 0);
          --ml-border: oklch(1 0 0 / 12%);
          --ml-border-soft: oklch(1 0 0 / 7%);
          background: var(--ml-bg);
          color: var(--ml-fg);
        }
        .glass { background:transparent; border:1px solid var(--ml-border); }
        .amber-grad { background:none; -webkit-text-fill-color:currentColor; color:var(--ml-fg); }
        .pill-cta { background:var(--ml-fg); color:var(--ml-bg); border-radius:.375rem; font-weight:500; font-family:${F}; transition:opacity .2s ease; display:inline-flex; align-items:center; gap:7px; }
        .pill-cta:hover { opacity:.86; }
        .nav-pill { background:transparent; border:1px solid var(--ml-border); border-radius:.375rem; display:flex; align-items:center; padding:4px 6px; gap:2px; }
        .nav-link { padding:6px 12px; border-radius:.25rem; font-size:.8rem; font-weight:400; color:var(--ml-muted); transition:all .2s; white-space:nowrap; text-decoration:none; }
        .nav-link:hover { color:var(--ml-fg); background:oklch(1 0 0 / 6%); }
        .nav-link-active { color:var(--ml-fg); background:oklch(1 0 0 / 8%); }
        .section-label { font-size:.72rem; font-weight:500; color:var(--ml-muted); margin-bottom:.6rem; display:block; font-family:${F}; letter-spacing:0; text-transform:none; }
        .body-text { color:var(--ml-muted); font-size:.95rem; line-height:1.7; font-weight:400; font-family:${F}; text-wrap:pretty; }
      `}</style>

      {/* Fondo plano de un solo color: sin estrellas ni halos radiales. */}

<nav className="fixed top-0 inset-x-0" style={{ zIndex: 50 }}>
        <div className={`transition-all duration-500 ${scrolled ? 'py-2' : 'py-5'}`}
             style={scrolled ? { background: 'oklch(0.145 0 0 / 92%)', borderBottom: '1px solid var(--ml-border)' } : undefined}>
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center" aria-label="PropSync inicio">
              <Image src="/logo-lockup.png" alt="PropSync" width={130} height={32} priority style={{ width: 'auto', height: 32, display: 'block' }} />
            </Link>
            <div className="nav-pill hidden md:flex">
              <Link href="/plataforma" className="nav-link">{t.platform}</Link>
              <Link href="/marketing" className="nav-link">{t.marketing}</Link>
              <Link href="/ia" className="nav-link">{t.ai}</Link>
              <Link href="/precios" className="nav-link">{t.pricing}</Link>
              <Link href="/contacto" className="nav-link">{t.contact}</Link>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleLang} className="text-xs px-3 py-1.5 rounded-md transition-colors"
                      style={{ border: '1px solid var(--ml-border)', color: 'var(--ml-muted)' }}>
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
              <Link href="/login" className="hidden sm:inline-flex text-sm px-4 py-2 rounded-md transition-colors"
                    style={{ color: 'var(--ml-muted)', border: '1px solid var(--ml-border)' }}>
                {t.login}
              </Link>
              <Link href="/registro" className="pill-cta px-5 py-2 text-sm">
                {t.cta}
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 9.5L9.5 1.5M9.5 1.5H3.5M9.5 1.5V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 10, paddingTop: 110 }}>
        {children}
      </main>

      {/* Footer */}
      <footer className="px-6 pt-16 pb-8" style={{ borderTop: '1px solid var(--ml-border)', zIndex: 10, position: 'relative', background: 'transparent' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <h3 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 200, letterSpacing: '-.03em', lineHeight: 1.2, fontFamily: F, marginBottom: '.5rem' }}>
              {f.ctaTitle}
            </h3>
            <p style={{ fontSize: '.875rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, marginBottom: '1.75rem' }}>
              {f.ctaSub}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/registro" className="pill-cta px-7 py-3 text-sm">
                {f.ctaPrimary}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </Link>
              <Link href="/contacto" className="px-7 py-3 text-sm rounded-md transition-colors" style={{ border: '1px solid var(--ml-border)', color: 'var(--ml-fg)', fontFamily: F, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {f.ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10" style={{ borderBottom: '1px solid var(--ml-border)' }}>
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="inline-flex items-center mb-3" aria-label="PropSync inicio">
                <Image src="/logo-lockup.png" alt="PropSync" width={140} height={36} style={{ width: 'auto', height: 36, display: 'block' }} />
              </Link>
              <p style={{ fontSize: '.78rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, lineHeight: 1.6, maxWidth: 240 }}>
                {f.tagline}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'var(--ml-muted)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>{f.product}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><Link href="/plataforma" style={{ fontSize: '.82rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.platform}</Link></li>
                <li><Link href="/marketing" style={{ fontSize: '.82rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.marketing}</Link></li>
                <li><Link href="/ia" style={{ fontSize: '.82rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.ai}</Link></li>
                <li><Link href="/precios" style={{ fontSize: '.82rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.pricing}</Link></li>
              </ul>
            </div>
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'var(--ml-muted)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>{f.company}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><Link href="/contacto" style={{ fontSize: '.82rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.contact}</Link></li>
                <li><a href="https://elevarewebservices.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '.82rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>Elevare</a></li>
              </ul>
            </div>
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'var(--ml-muted)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>{f.account}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><Link href="/registro" style={{ fontSize: '.82rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{f.register}</Link></li>
                <li><Link href="/login" style={{ fontSize: '.82rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.login}</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-7 flex flex-col md:flex-row items-center justify-between gap-3" style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.22)', fontFamily: F }}>
            <span>© {new Date().getFullYear()} PropSync · {f.rights}</span>
            <span>{f.credit}{' '}
              <a href="https://elevarewebservices.com" target="_blank" rel="noopener noreferrer"
                 style={{ color: 'var(--ml-muted)', fontWeight: 500, letterSpacing: '.06em', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,.2)', paddingBottom: 1 }}>
                Elevare
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
