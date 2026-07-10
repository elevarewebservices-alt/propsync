import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/propiedades',
          '/propietarios',
          '/crm',
          '/mantener',
          '/configuracion',
          '/asistente',
          '/suscripcion',
          '/panel-elevare',
          '/ayuda',
          '/auth/',
          '/update-password',
        ],
      },
    ],
    sitemap: 'https://www.propsyncia.com/sitemap.xml',
  }
}
