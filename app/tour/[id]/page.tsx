import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { TourViewer } from '@/components/propiedades/TourViewer'
import type { TourRoom } from '@/lib/types'
import type { Metadata } from 'next'

interface Props {
  params: { id: string }
  searchParams: { embed?: string }
}

interface PropertyTourData {
  id: string
  titulo: string
  ciudad: string | null
  zona: string | null
  main_image_url: string | null
  tour_rooms: unknown
}

async function getProperty(id: string): Promise<PropertyTourData | null> {
  const db = createAdminClient()
  const { data } = await (db.from('properties') as any)
    .select('id, titulo, ciudad, zona, main_image_url, tour_rooms')
    .eq('id', id)
    .single()
  return data as PropertyTourData | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const prop = await getProperty(params.id)
  if (!prop) return {}
  return {
    title: `Tour virtual — ${prop.titulo}`,
    description: `Recorre esta propiedad en ${prop.ciudad ?? 'Panamá'}`,
    openGraph: {
      title: `Tour virtual — ${prop.titulo}`,
      images: prop.main_image_url ? [{ url: prop.main_image_url }] : [],
    },
  }
}

export default async function TourPage({ params, searchParams }: Props) {
  const prop = await getProperty(params.id)
  if (!prop) notFound()

  const rooms: TourRoom[] = Array.isArray(prop.tour_rooms) ? (prop.tour_rooms as TourRoom[]) : []

  if (rooms.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 text-sm">Este tour no tiene fotos aún.</p>
      </div>
    )
  }

  const isEmbed = searchParams.embed === 'true'

  return (
    <div className={isEmbed ? 'w-full h-screen' : 'fixed inset-0'}>
      <TourViewer
        rooms={rooms}
        titulo={prop.titulo}
        ciudad={prop.ciudad}
        embed={isEmbed}
      />
    </div>
  )
}
