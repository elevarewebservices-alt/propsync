'use client'

import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Property, EstadoPublicacion, Disponibilidad, WhatsAppStatus } from '@/lib/types'
import {
  MoreVertical,
  Eye,
  Phone,
  Copy,
  Archive,
  Trash2,
  MessageCircle,
  ChevronDown,
} from 'lucide-react'

function waUrl(phone: string, titulo: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const msg = `Hola, te escribo por tu propiedad "${titulo}". ¿Sigue disponible?`
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`
}

const estadoConfig: Record<EstadoPublicacion, { label: string; className: string }> = {
  activo:    { label: 'Activo',    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' },
  destacado: { label: 'Destacado', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  inactivo:  { label: 'Inactivo',  className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
}

const disponibilidadConfig: Record<Disponibilidad, { label: string; className: string }> = {
  disponible: { label: 'Disponible', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  vendido:    { label: 'Vendido',    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  alquilado:  { label: 'Alquilado', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
}

const whatsappConfig: Record<WhatsAppStatus, { label: string; dot: string }> = {
  no_contactado: { label: 'Sin contactar', dot: 'bg-gray-400' },
  contactado:    { label: 'Contactado',    dot: 'bg-blue-500' },
  disponible:    { label: 'Disponible',    dot: 'bg-green-500' },
  vendida:       { label: 'Vendida',       dot: 'bg-purple-500' },
  no_disponible: { label: 'No disponible', dot: 'bg-red-500' },
}

interface PropertyCardProps {
  property: Property
  onSelect?: (property: Property) => void
  onUpdate?: (id: string, field: 'estado_publicacion' | 'disponibilidad', value: string) => void
}

export function PropertyCard({ property, onSelect, onUpdate }: PropertyCardProps) {
  const estado = estadoConfig[property.estado_publicacion]
  const disp   = disponibilidadConfig[property.disponibilidad]
  const wa     = whatsappConfig[property.whatsappEstado]

  function stopAndUpdate(e: React.MouseEvent, field: 'estado_publicacion' | 'disponibilidad', value: string) {
    e.stopPropagation()
    onUpdate?.(property.id, field, value)
  }

  return (
    <div
      className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect?.(property)}
    >
      <div className="relative h-44 w-full overflow-hidden bg-muted">
        <Image
          src={property.imagenes[0]}
          alt={property.titulo}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
        {/* Estado badge — clickable dropdown */}
        <div className="absolute top-2 left-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(
              'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 focus:outline-none',
              estado.className
            )}>
              {estado.label}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider py-1">
                Estado publicación
              </DropdownMenuLabel>
              {(Object.entries(estadoConfig) as [EstadoPublicacion, typeof estadoConfig[EstadoPublicacion]][]).map(([val, cfg]) => (
                <DropdownMenuItem
                  key={val}
                  className={cn('gap-2 text-sm', property.estado_publicacion === val && 'font-semibold')}
                  onClick={(e) => stopAndUpdate(e, 'estado_publicacion', val)}
                >
                  <span className={cn('inline-block h-2 w-2 rounded-full border', cfg.className)} />
                  {cfg.label}
                  {property.estado_publicacion === val && ' ✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Disponibilidad badge — clickable dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(
              'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 focus:outline-none',
              disp.className
            )}>
              {disp.label}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider py-1">
                Disponibilidad
              </DropdownMenuLabel>
              {(Object.entries(disponibilidadConfig) as [Disponibilidad, typeof disponibilidadConfig[Disponibilidad]][]).map(([val, cfg]) => (
                <DropdownMenuItem
                  key={val}
                  className={cn('gap-2 text-sm', property.disponibilidad === val && 'font-semibold')}
                  onClick={(e) => stopAndUpdate(e, 'disponibilidad', val)}
                >
                  <span className={cn('inline-block h-2 w-2 rounded-full border', cfg.className)} />
                  {cfg.label}
                  {property.disponibilidad === val && ' ✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs bg-black/60 text-white border-0">
            {property.tipo === 'venta' ? 'Venta' : 'Arriendo'}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {property.titulo}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{property.zona}</p>
        <p className="mt-2 text-lg font-bold text-blue-600 dark:text-blue-400">
          {property.tipo === 'venta'
            ? `$${property.precio.toLocaleString()}`
            : `$${property.precio.toLocaleString()}/mes`}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-3 w-3 text-muted-foreground" />
            <span className={`inline-block h-2 w-2 rounded-full ${wa.dot}`} />
            <span className="text-xs text-muted-foreground">{wa.label}</span>
          </div>

          <div className="flex items-center gap-1">
            {property.telefono_propietario && (
              <a
                href={waUrl(property.telefono_propietario, property.titulo)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
                title="Contactar propietario por WhatsApp"
              >
                <MessageCircle className="h-3 w-3" /> WA
              </a>
            )}
            <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect?.(property) }}>
                <Eye className="mr-2 h-4 w-4" /> Ver detalles CRM
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Phone className="mr-2 h-4 w-4" /> Contactar propietario
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" /> Duplicar en Wasi
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="mr-2 h-4 w-4" /> Inactivar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Mover a papelera
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
    </div>
  )
}
