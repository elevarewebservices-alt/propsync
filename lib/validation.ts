/**
 * Shared validation helpers — used across all forms (CRM, login, registro,
 * landing contact, configuracion). Keep the rules in ONE place so behaviour
 * stays consistent.
 *
 * - Email: RFC-light regex that catches the realistic mistakes (no @, no TLD,
 *   trailing dot, spaces, double @). Anything stricter than this produces
 *   false positives on valid addresses.
 * - Phone: international-friendly. Accepts spaces, dashes, parentheses, and
 *   an optional leading +. Requires 7-15 digits (E.164 max is 15).
 */

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE  = /^\+?[\d\s().-]{7,20}$/
const DIGITS_RE = /\d/g

export function isValidEmail(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (v.length > 254) return false
  if (v.includes('..')) return false
  return EMAIL_RE.test(v)
}

export function isValidPhone(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (!PHONE_RE.test(v)) return false
  const digits = (v.match(DIGITS_RE) ?? []).length
  return digits >= 7 && digits <= 15
}

export function validateEmail(value: string, opts: { required?: boolean } = {}): string | null {
  const v = value.trim()
  if (!v) return opts.required ? 'El email es requerido' : null
  if (!isValidEmail(v)) return 'Email no válido (ejemplo: nombre@dominio.com)'
  return null
}

export function validatePhone(value: string, opts: { required?: boolean } = {}): string | null {
  const v = value.trim()
  if (!v) return opts.required ? 'El teléfono es requerido' : null
  if (!isValidPhone(v)) return 'Teléfono no válido (incluye 7-15 dígitos)'
  return null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True if the value is a well-formed UUID (use before hitting the DB with an id). */
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

/**
 * Sanitizes free-text user input for safe storage/use: replaces control chars
 * and newlines with spaces (prevents email-header / CRLF injection), trims, and
 * hard-caps the length. Returns '' for non-strings.
 */
export function cleanText(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return ''
  let out = ''
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    out += code < 0x20 || code === 0x7f ? ' ' : ch
  }
  return out.trim().slice(0, maxLen)
}

/** Cleans a phone for storage — keeps + and digits only. */
export function normalizePhone(value: string): string {
  const v = value.trim()
  if (!v) return ''
  const hasPlus = v.startsWith('+')
  const digits  = v.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}
