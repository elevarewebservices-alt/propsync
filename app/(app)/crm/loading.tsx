import { ListSkeleton } from '@/components/skeletons/ListSkeleton'

export default function CrmLoading() {
  return <ListSkeleton rows={10} label="Cargando contactos…" />
}
