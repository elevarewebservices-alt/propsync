import Image from 'next/image'
import Link from 'next/link'

type LogoVariant = 'lockup' | 'mark' | 'wordmark'

interface LogoProps {
  variant?: LogoVariant
  href?: string
  className?: string
  iconSize?: number
  showText?: boolean
  textClassName?: string
}

const SRC: Record<LogoVariant, string> = {
  lockup: '/logo-lockup.png',
  mark: '/logo-mark.png',
  wordmark: '/logo-wordmark.png',
}

const DIMENSIONS: Record<LogoVariant, { w: number; h: number }> = {
  lockup: { w: 384, h: 144 },
  mark: { w: 567, h: 286 },
  wordmark: { w: 508, h: 244 },
}

export function Logo({
  variant = 'lockup',
  href,
  className = '',
  iconSize,
  showText,
  textClassName = '',
}: LogoProps) {
  const dims = DIMENSIONS[variant]
  const h = iconSize ?? (variant === 'mark' ? 32 : 36)
  const w = Math.round((dims.w / dims.h) * h)

  const img = (
    <Image
      src={SRC[variant]}
      alt="PropSync"
      width={w}
      height={h}
      priority
      style={{ width: 'auto', height: h, display: 'block' }}
    />
  )

  if (showText && variant === 'mark') {
    const content = (
      <span className={`flex items-center gap-2.5 ${className}`}>
        {img}
        <span className={`text-lg font-bold tracking-tight ${textClassName}`}>PropSync</span>
      </span>
    )
    return href ? <Link href={href}>{content}</Link> : content
  }

  if (href) {
    return (
      <Link href={href} className={`inline-flex items-center ${className}`}>
        {img}
      </Link>
    )
  }

  return <span className={`inline-flex items-center ${className}`}>{img}</span>
}
