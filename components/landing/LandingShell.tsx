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
    <div style={{ background: '#06060d', color: '#fff', overflowX: 'hidden', fontFamily: F, minHeight: '100vh' }}>
      <style suppressHydrationWarning>{`
        @keyframes twinkle { 0%,100%{opacity:.07} 50%{opacity:.5} }
        @keyframes pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
        .glass { background:rgba(255,255,255,.042); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,.085); }
        .amber-grad { background:linear-gradient(135deg,#fbbf24 0%,#fb923c 38%,#e879f9 72%,#818cf8 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .pill-cta { background:rgba(255,255,255,.95); color:#06060d; border-radius:9999px; font-weight:600; font-family:${F}; transition:all .25s ease; display:inline-flex; align-items:center; gap:7px; }
        .pill-cta:hover { background:#fff; transform:translateY(-2px); box-shadow:0 16px 48px rgba(251,191,36,.22); }
        .nav-pill { background:rgba(255,255,255,.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,.09); border-radius:9999px; display:flex; align-items:center; padding:5px 8px; gap:2px; }
        .nav-link { padding:6px 14px; border-radius:9999px; font-size:.8rem; font-weight:400; color:rgba(255,255,255,.45); transition:all .2s; white-space:nowrap; text-decoration:none; }
        .nav-link:hover { color:rgba(255,255,255,.88); background:rgba(255,255,255,.07); }
        .nav-link-active { color:rgba(255,255,255,.95); background:rgba(255,255,255,.08); }
        .section-label { font-size:.68rem; letter-spacing:.2em; text-transform:uppercase; color:rgba(251,191,36,.5); margin-bottom:.75rem; display:block; font-family:${F}; }
        .h2 { font-size:clamp(1.9rem,5vw,3rem); font-weight:200; letter-spacing:-.035em; line-height:1.2; font-family:${F}; }
        .body-text { color:rgba(255,255,255,.36); font-size:1rem; line-height:1.75; font-weight:300; font-family:${F}; }
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
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 700, height: 700, background: 'radial-gradient(ellipse at 0% 0%,rgba(251,146,60,.07) 0%,transparent 55%)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 600, height: 600, background: 'radial-gradient(ellipse at 100% 100%,rgba(139,92,246,.07) 0%,transparent 55%)' }} />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0" style={{ zIndex: 50 }}>
        <div className={`transition-all duration-500 ${scrolled ? 'py-2' : 'py-5'}`}
             style={scrolled ? { background: 'rgba(6,6,13,.9)', backdropFilter: 'blur(28px)', borderBottom: '1px solid rgba(255,255,255,.06)' } : undefined}>
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
              <button onClick={toggleLang} className="text-xs px-3 py-1.5 rounded-full transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,.13)', color: 'rgba(255,255,255,.38)' }}>
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
              <Link href="/login" className="hidden sm:inline-flex text-sm px-4 py-2 rounded-full transition-colors"
                    style={{ color: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.13)' }}>
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
      <footer className="px-6 pt-16 pb-8" style={{ borderTop: '1px solid rgba(255,255,255,.055)', zIndex: 10, position: 'relative', background: 'linear-gradient(180deg,transparent 0%,rgba(255,255,255,.012) 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <h3 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 200, letterSpacing: '-.03em', lineHeight: 1.2, fontFamily: F, marginBottom: '.5rem' }}>
              {f.ctaTitle}
            </h3>
            <p style={{ fontSize: '.875rem', color: 'rgba(255,255,255,.38)', fontFamily: F, fontWeight: 300, marginBottom: '1.75rem' }}>
              {f.ctaSub}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/registro" className="pill-cta px-7 py-3 text-sm">
                {f.ctaPrimary}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </Link>
              <Link href="/contacto" className="px-7 py-3 text-sm rounded-full transition-colors" style={{ border: '1px solid rgba(255,255,255,.18)', color: 'rgba(255,255,255,.7)', fontFamily: F, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {f.ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,.055)' }}>
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="inline-flex items-center mb-3" aria-label="PropSync inicio">
                <Image src="/logo-lockup.png" alt="PropSync" width={140} height={36} style={{ width: 'auto', height: 36, display: 'block' }} />
              </Link>
              <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 300, lineHeight: 1.6, maxWidth: 240 }}>
                {f.tagline}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>{f.product}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><Link href="/plataforma" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.platform}</Link></li>
                <li><Link href="/marketing" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.marketing}</Link></li>
                <li><Link href="/ia" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.ai}</Link></li>
                <li><Link href="/precios" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.pricing}</Link></li>
              </ul>
            </div>
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>{f.company}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><Link href="/contacto" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.contact}</Link></li>
                <li><a href="https://elevarewebservices.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>Elevare</a></li>
              </ul>
            </div>
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>{f.account}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><Link href="/registro" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{f.register}</Link></li>
                <li><Link href="/login" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.login}</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-7 flex flex-col md:flex-row items-center justify-between gap-3" style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.22)', fontFamily: F }}>
            <span>© {new Date().getFullYear()} PropSync · {f.rights}</span>
            <span>{f.credit}{' '}
              <a href="https://elevarewebservices.com" target="_blank" rel="noopener noreferrer"
                 style={{ color: 'rgba(255,255,255,.55)', fontWeight: 500, letterSpacing: '.06em', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,.2)', paddingBottom: 1 }}>
                Elevare
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
