import type { Metadata, Viewport } from 'next'
import { Inter, Outfit, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { PwaInit } from '@/components/PwaInit'

const inter  = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const jakarta = DM_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.propsyncia.com'),
  title: {
    default: 'PropSync — CRM inmobiliario con IA para Panamá',
    template: '%s · PropSync',
  },
  description:
    'El CRM inmobiliario hecho para Panamá: base de datos de propiedades, CRM nativo, tours 360° y asistente con IA. Publica en Encuentra24 y Compre o Alquile desde un solo lugar. Prueba 15 días gratis.',
  keywords: [
    'CRM inmobiliario',
    'CRM inmobiliario Panamá',
    'software inmobiliario',
    'software para inmobiliarias Panamá',
    'base de datos de propiedades',
    'tour virtual 360',
    'bienes raíces Panamá',
    'PropSync',
  ],
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    locale: 'es_PA',
    url: 'https://www.propsyncia.com',
    siteName: 'PropSync',
    title: 'PropSync — CRM inmobiliario con IA para Panamá',
    description:
      'Base de datos · CRM · IA — todo en uno para inmobiliarias. Tu inventario, siempre activo, siempre publicado. Prueba 15 días gratis.',
    images: [{ url: '/logo-lockup.png', width: 1536, height: 583, alt: 'PropSync — CRM inmobiliario con IA' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PropSync — CRM inmobiliario con IA para Panamá',
    description:
      'Base de datos · CRM · IA — todo en uno para inmobiliarias. Prueba 15 días gratis.',
    images: ['/logo-lockup.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192.png',
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'PropSync',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a73e8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover', // extend under the notch; pair with safe-area CSS
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
        <PwaInit />
      </body>
    </html>
  )
}
