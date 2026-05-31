import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { EstadoPublicacion, Disponibilidad } from '@/lib/types'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecentProperty } from '@/lib/dashboard'

const estadoConfig: Record<EstadoPublicacion, { label: string; className: string }> = {
  activo:    { label: 'Activo',    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  destacado: { label: 'Destacado', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  inactivo:  { label: 'Inactivo',  className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

const dispConfig: Record<Disponibilidad, { label: string; className: string }> = {
  disponible: { label: 'Disponible', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  vendido:    { label: 'Vendido',    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  alquilado:  { label: 'Alquilado', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
}

export function RecentProperties({ properties }: { properties: RecentProperty[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Propiedades recientes</h2>
        <Link href="/propiedades" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          Ver todas <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          Aún no hay propiedades. <Link href="/propiedades/nueva" className="text-primary hover:underline">Agrega la primera</Link>.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Propiedad</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Precio</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {properties.map((prop) => {
                const estado = estadoConfig[prop.estado_publicacion]
                const disp = dispConfig[prop.disponibilidad]
                return (
                  <tr key={prop.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-14 overflow-hidden rounded-md shrink-0 bg-muted">
                          {prop.main_image_url ? (
                            <Image src={prop.main_image_url} alt={prop.titulo} fill className="object-cover" sizes="56px" unoptimized />
                          ) : (
                            <div className="h-full w-full bg-muted" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground line-clamp-1 max-w-[200px]">{prop.titulo}</p>
                          <p className="text-xs text-muted-foreground">{[prop.zona, prop.ciudad].filter(Boolean).join(', ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">
                      {prop.tipo === 'venta' ? `$${prop.precio.toLocaleString()}` : `$${prop.precio.toLocaleString()}/mes`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="secondary" className={`text-xs ${estado.className}`}>{estado.label}</Badge>
                        <Badge variant="secondary" className={`text-xs ${disp.className}`}>{disp.label}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href="/propiedades" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Ver</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
