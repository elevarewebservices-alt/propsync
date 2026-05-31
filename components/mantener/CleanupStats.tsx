import { Database, Copy, Trash2, CheckCircle2 } from 'lucide-react'
import { MOCK_PROPERTIES } from '@/lib/mock-data'

export function CleanupStats() {
  const total = MOCK_PROPERTIES.length
  const inactivas = MOCK_PROPERTIES.filter((p) => p.estado_publicacion === 'inactivo').length
  const vendidas = MOCK_PROPERTIES.filter((p) => p.disponibilidad === 'vendido').length
  const alquiladas = MOCK_PROPERTIES.filter((p) => p.disponibilidad === 'alquilado').length

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[
        {
          label: 'Total propiedades',
          value: total,
          icon: Database,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/30',
        },
        {
          label: 'Inactivas',
          value: inactivas,
          icon: Trash2,
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-950/30',
        },
        {
          label: 'Vendidas',
          value: vendidas,
          icon: CheckCircle2,
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-950/30',
        },
        {
          label: 'Alquiladas',
          value: alquiladas,
          icon: Copy,
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-950/30',
        },
      ].map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={`rounded-xl border border-border ${bg} p-4`}>
          <Icon className={`h-5 w-5 ${color} mb-2`} />
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}
