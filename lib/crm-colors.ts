/**
 * Single source of truth for CRM visual identity.
 *
 * Previously `initials`/`avatarBg` were duplicated in ContactsTable and the
 * contact detail page with palettes of different lengths (7 vs 5), so the same
 * contact rendered a different avatar colour depending on the screen. The tipo
 * badge had three separate maps that disagreed on `broker` and `propietario`.
 * Everything CRM-visual now resolves here so the views cannot drift again.
 */

/** Up to two initials, e.g. "María López" -> "ML". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

const AVATAR_PALETTE = [
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200',
  'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-200',
]

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return h
}

/** Deterministic pastel avatar — same name always yields the same colour. */
export function avatarBg(name: string): string {
  return AVATAR_PALETTE[hash(name) % AVATAR_PALETTE.length]
}

/** Contact type badge. One map — the table, the board and the detail page share it. */
const TIPO_BADGE: Record<string, string> = {
  cliente:     'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',
  propietario: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60',
  broker:      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
}

export function tipoBadge(tipo: string): string {
  return TIPO_BADGE[tipo] ?? 'bg-muted text-muted-foreground border-border'
}

const TAG_PALETTE = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-200',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
]

/** Deterministic tag chip colour, dark-mode aware. */
export function tagColor(tag: string): string {
  return TAG_PALETTE[hash(tag) % TAG_PALETTE.length]
}

/**
 * Stage colours are author-chosen hex values, so they cannot be trusted as text
 * colours: a mid-tone stage like amber #f59e0b renders around 2.1:1 on white and
 * fails WCAG AA. The colour therefore identifies the stage through a dot and a
 * faint tint, while the label uses the theme's own foreground token — legible in
 * both light and dark, whatever hex the agency picks.
 */
export function stageChipStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: withAlpha(color, 0.1),
    borderColor: withAlpha(color, 0.35),
  }
}

/** Normalises #abc / #aabbcc / rgb() to an rgba() string at the given alpha. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim()
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)
  if (!m) return color // named colours / rgb() pass through untouched
  let body = m[1]
  if (body.length === 3) body = body.split('').map((c) => c + c).join('')
  const r = parseInt(body.slice(0, 2), 16)
  const g = parseInt(body.slice(2, 4), 16)
  const b = parseInt(body.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
