import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2.5 mb-3" aria-label="PropSync inicio">
            <Image src="/logo-mark.png" alt="PropSync" width={44} height={44} priority style={{ width: 44, height: 44, display: 'block', objectFit: 'contain' }} />
            <span className="text-2xl font-bold text-foreground tracking-tight">PropSync</span>
          </Link>
          <p className="text-sm text-muted-foreground mt-1">Plataforma inmobiliaria integral</p>
        </div>
        {children}
      </div>
    </div>
  )
}
