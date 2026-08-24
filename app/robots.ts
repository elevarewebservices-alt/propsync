import type { MetadataRoute } from 'next'

// Rastreadores de los motores de IA. Ya quedaban permitidos por la regla '*',
// pero declararlos explícitamente deja constancia de la decisión: queremos que
// ChatGPT, Claude, Perplexity y AI Overviews puedan leer e citar el sitio. Si
// alguna vez se quiere revertir, se cambia aquí y no en una regla comodín que
// también afecta a Google.
const AI_CRAWLERS = [
  'GPTBot',          // OpenAI / ChatGPT
  'OAI-SearchBot',   // OpenAI search
  'ChatGPT-User',    // navegación en vivo de ChatGPT
  'ClaudeBot',       // Anthropic
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended', // Gemini / AI Overviews
  'Applebot-Extended',
  'CCBot',           // Common Crawl (alimenta a varios modelos)
]

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
      // Los bots de IA sólo necesitan el sitio público de marketing; el área
      // autenticada no les aporta nada y no debe entrar en ningún índice.
      {
        userAgent: AI_CRAWLERS,
        allow: '/',
        disallow: ['/api/', '/dashboard', '/propiedades', '/propietarios', '/crm', '/mantener', '/configuracion', '/asistente', '/suscripcion', '/panel-elevare', '/ayuda', '/auth/', '/update-password'],
      },
    ],
    sitemap: 'https://www.propsyncia.com/sitemap.xml',
  }
}
