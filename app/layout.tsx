import type { Metadata } from 'next'
import { Inter, Outfit, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter  = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const jakarta = DM_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'PropSync — Base de datos, CRM e IA para inmobiliarias',
  description: 'PropSync centraliza tu inventario de propiedades, gestiona clientes con CRM nativo y potencia tu agencia con inteligencia artificial.',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192.png',
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
