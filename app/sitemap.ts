import type { MetadataRoute } from 'next'

const BASE = 'https://www.propsyncia.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: `${BASE}/`,           lastModified, changeFrequency: 'weekly',  priority: 1 },
    { url: `${BASE}/plataforma`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/precios`,    lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/marketing`,  lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/ia`,         lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/contacto`,   lastModified, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${BASE}/privacidad`, lastModified, changeFrequency: 'yearly',  priority: 0.2 },
  ]
}
