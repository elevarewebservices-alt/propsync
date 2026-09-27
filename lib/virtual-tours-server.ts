import 'server-only'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient, createServerSupabaseClient } from './supabase'
import { resolvePermissions } from './permissions'
import { getCompanyAccess } from './subscription'
import {
  type VirtualTour,
  type TourDocument,
  type TourRow,
} from './virtual-tours'
import { demoTour, demoProperty } from './virtual-tours-demo'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Supabase's current client expects structural record types, whereas the legacy
// schema uses interfaces for rows. Materialize those interfaces at this boundary.
type RecordShape<T> = { [K in keyof T]: T[K] }
type TourDatabase = {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: {
      [K in keyof Database['public']['Tables']]: {
        [F in keyof Database['public']['Tables'][K]]: F extends 'Relationships'
          ? Database['public']['Tables'][K][F]
          : RecordShape<Database['public']['Tables'][K][F]>
      }
    }
  }
}

export class TourError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}
export function tourFailure(e: unknown) {
  return NextResponse.json(
    {
      error:
        e instanceof TourError
          ? e.message
          : 'No se pudo completar la operación. Revisa la conexión y vuelve a intentarlo.',
    },
    { status: e instanceof TourError ? e.status : 500 },
  )
}
export const tourDB = () =>
  createAdminClient() as unknown as SupabaseClient<TourDatabase>
export async function tourActor() {
  const jar = cookies()
  const auth = createServerSupabaseClient({
    get: (name) => jar.get(name)?.value,
    set: () => {},
    remove: () => {},
  })
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new TourError('Inicia sesión para administrar tours.', 401)
  const { data: agent } = await tourDB()
    .from('agents')
    .select('id,company_id,rol,permissions')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!agent) throw new TourError('No tienes acceso.', 403)
  if ((await getCompanyAccess(agent.company_id)).blocked)
    throw new TourError('Revisa la suscripción de tu cuenta.', 403)
  return {
    userId: user.id,
    companyId: agent.company_id as string,
    agentId: agent.id as string,
    all: resolvePermissions(agent.rol, agent.permissions).editAllProperties,
  }
}
export async function ownedTour(
  id: string,
  actor: Awaited<ReturnType<typeof tourActor>>,
) {
  const { data, error } = await tourDB()
    .from('virtual_tours')
    .select('*')
    .eq('id', id)
    .eq('company_id', actor.companyId)
    .single()
  if (error || !data || (!actor.all && data.created_by !== actor.userId))
    throw new TourError('Tour no encontrado.', 404)
  return data
}
export async function checkTourProperty(
  id: string | null,
  actor: Awaited<ReturnType<typeof tourActor>>,
) {
  if (!id) return
  const { data } = await tourDB()
    .from('properties')
    .select('id,agente_asignado_id')
    .eq('id', id)
    .eq('company_id', actor.companyId)
    .single()
  if (!data || (!actor.all && data.agente_asignado_id !== actor.agentId))
    throw new TourError('No puedes vincular esta propiedad.', 403)
}
export function tourProjection(row: TourRow): VirtualTour {
  return {
    ...(row.document as TourDocument),
    property_id: row.property_id,
    slug: row.slug,
    id: row.id,
    status: row.status,
    revision: row.revision,
    created_at: row.created_at,
  }
}
export async function publishedTour(slug: string) {
  if (slug === 'demo') return { tour: demoTour, property: demoProperty }
  const db = tourDB()
  const { data } = await db
    .from('virtual_tours')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!data) return null
  let property = null
  if (data.property_id) {
    const result = await db
      .from('properties')
      .select('titulo,precio,iso_currency,area,bedrooms,bathrooms,descripcion')
      .eq('id', data.property_id)
      .eq('company_id', data.company_id)
      .maybeSingle()
    property = result.data
  }
  return { tour: tourProjection(data), property }
}
