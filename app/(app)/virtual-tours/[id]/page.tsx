import { TourEditor } from '@/components/virtual-tours/TourEditor'
export default function VirtualTourEditorPage({ params }: { params: { id: string } }) { return <TourEditor id={params.id} /> }
