import type { Contact } from './types'

export interface PropertyForMatch {
  id: string
  titulo: string
  precio: number
  tipo: 'venta' | 'arriendo'
  ciudad: string | null
  zona: string | null
  bedrooms: number | null
  bathrooms: number | null
  estado_publicacion: string
  disponibilidad: string
  main_image_url: string | null
}

export interface MatchResult {
  property: PropertyForMatch
  score: number        // 0-100
  reasons: string[]    // human-readable match reasons
}

export function scorePropertyForContact(
  property: PropertyForMatch,
  contact: Contact,
): MatchResult {
  let score = 0
  const reasons: string[] = []

  // Only available properties should score positively
  if (property.disponibilidad !== 'disponible') return { property, score: 0, reasons: [] }
  if (!['activo', 'destacado'].includes(property.estado_publicacion)) {
    return { property, score: 0, reasons: [] }
  }

  // ── Type match (30 pts) ─────────────────────────────────────────────────────
  const wantsVenta  = contact.tipo_operacion === 'compra' || contact.tipo_operacion === 'ambas'
  const wantsArriendo = contact.tipo_operacion === 'alquiler' || contact.tipo_operacion === 'ambas'
  const isVenta    = property.tipo === 'venta'
  const isArriendo = property.tipo === 'arriendo'

  if ((isVenta && wantsVenta) || (isArriendo && wantsArriendo)) {
    score += 30
    reasons.push(isVenta ? 'Venta' : 'Arriendo')
  } else {
    // type mismatch is a hard blocker
    return { property, score: 0, reasons: [] }
  }

  // ── Price range (35 pts) ────────────────────────────────────────────────────
  const min = contact.presupuesto_min
  const max = contact.presupuesto_max
  if (min !== null && max !== null) {
    if (property.precio >= min && property.precio <= max) {
      score += 35
      reasons.push('Precio en rango')
    } else {
      const tolerance = (max - min) * 0.2 || max * 0.2
      if (property.precio >= min - tolerance && property.precio <= max + tolerance) {
        score += 15
        reasons.push('Precio cercano al rango')
      }
      // Outside range: 0 pts
    }
  } else if (max !== null && property.precio <= max) {
    score += 25
    reasons.push('Dentro de presupuesto máximo')
  } else if (min !== null && property.precio >= min) {
    score += 10
  }

  // ── Location (20 pts) ───────────────────────────────────────────────────────
  if (contact.zona_interes && property.zona) {
    const zonaMatch = property.zona.toLowerCase().includes(contact.zona_interes.toLowerCase()) ||
      contact.zona_interes.toLowerCase().includes(property.zona.toLowerCase())
    if (zonaMatch) {
      score += 20
      reasons.push(`Zona: ${property.zona}`)
    } else if (contact.ciudad && property.ciudad &&
               property.ciudad.toLowerCase() === contact.ciudad.toLowerCase()) {
      score += 10
      reasons.push(`Ciudad: ${property.ciudad}`)
    }
  } else if (contact.ciudad && property.ciudad &&
             property.ciudad.toLowerCase() === contact.ciudad.toLowerCase()) {
    score += 15
    reasons.push(`Ciudad: ${property.ciudad}`)
  }

  // ── Bonus: destacado (5 pts) ────────────────────────────────────────────────
  if (property.estado_publicacion === 'destacado') {
    score += 5
    reasons.push('Destacado')
  }

  return { property, score: Math.min(score, 100), reasons }
}

export function matchPropertiesForContact(
  properties: PropertyForMatch[],
  contact: Contact,
  limit = 10,
): MatchResult[] {
  return properties
    .map((p) => scorePropertyForContact(p, contact))
    .filter((r) => r.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
