'use client'

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
}

const PROMPTS = [
  '¿Cuántas propiedades disponibles tenemos?',
  'Muéstrame los leads con seguimiento pendiente hoy',
  'Busca apartamentos en venta bajo $300,000',
  '¿Qué agente tiene más leads asignados?',
]

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col gap-2 px-4 pb-2">
      <p className="text-xs text-muted-foreground text-center mb-1">Sugerencias</p>
      {PROMPTS.map(p => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className="text-left text-sm px-3 py-2 rounded-xl border border-border bg-muted hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {p}
        </button>
      ))}
    </div>
  )
}
