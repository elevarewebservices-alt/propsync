import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { TourViewer } from '@/components/propiedades/TourViewer'
import type { TourRoom } from '@/lib/types'
import type { Metadata } from 'next'
import { cache } from 'react'
import { publishedTour } from '@/lib/virtual-tours-server'
import { PublicTour } from '@/components/virtual-tours/PublicTour'
import { assetUrl, UUID } from '@/lib/virtual-tours'

export const dynamic = 'force-dynamic'
const getTour = cache(publishedTour)

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
  if (!UUID.test(id)) return null
  const db = createAdminClient()
  const { data } = await (db.from('properties') as any)
    .select('id, titulo, ciudad, zona, main_image_url, tour_rooms')
    .eq('id', id)
    .single()
  return data as PropertyTourData | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getTour(params.id)
  if (result) {
    const { tour } = result
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://propsyncia.com'
    const cover = tour.cover || tour.scenes[0]?.image
    return { title: `${tour.name} · PropSync Virtual Tour`, description: tour.description, alternates: { canonical: `${origin}/tour/${tour.slug}` }, openGraph: { type: 'website', title: tour.name, description: tour.description, url: `${origin}/tour/${tour.slug}`, images: cover ? [{ url: new URL(assetUrl(tour.id, cover), origin).href }] : [] }, twitter: { card: 'summary_large_image', title: tour.name, description: tour.description } }
  }
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
  const result = await getTour(params.id)
  if (result) return <PublicTour tour={result.tour} property={result.property} />
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
