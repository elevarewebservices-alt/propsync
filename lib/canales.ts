export interface CanalPublicacion {
  id: string
  nombre: string
}

// Lugares de publicación disponibles para una propiedad — usados tanto en el
// formulario de propiedades como en la lista `limites.canales` de cada plan
// (lib/plans.ts), para que los ids nunca queden desincronizados.
export const CANALES_PUBLICACION: CanalPublicacion[] = [
  { id: 'comprealquile', nombre: 'Compre o Alquile' },
  { id: 'encuentra24',   nombre: 'Encuentra24' },
  { id: 'pagina_web',    nombre: 'Página web' },
]
