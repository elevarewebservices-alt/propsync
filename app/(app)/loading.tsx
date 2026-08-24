import { ListSkeleton } from '@/components/skeletons/ListSkeleton'

// Fallback loading UI for every route in the app shell that doesn't define its
// own. Its presence is what lets Next.js send the shell (sidebar, header, bottom
// nav) immediately and stream the page in behind it, instead of holding the
// whole response until the server components finish.
export default function AppLoading() {
  return <ListSkeleton />
}
