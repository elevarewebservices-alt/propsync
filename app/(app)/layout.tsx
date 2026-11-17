import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ChatWidget } from '@/components/assistant/ChatWidget'
import Link from 'next/link'
import { resolveCompanyId, CompanyBlockedError, getSessionUser } from '@/lib/auth'
import { isDemoEmail } from '@/lib/demo'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Trial / subscription gate — server-side, can't be bypassed from the client.
  // If the company's trial expired (or it's unpaid), kick it to /suscripcion
  // before any app content renders. resolveCompanyId is verified from the
  // session cookie; the verdict comes from getCompanyAccess (admin-read DB).
  // Note: redirect() must run OUTSIDE the try/catch (it throws to redirect).
  //
  // resolveCompanyId() already runs getCompanyAccess internally and throws
  // CompanyBlockedError when blocked, so the previous explicit second call was
  // a duplicate round trip on every page load. Both it and the session lookup
  // are memoized per request (React cache), so the page rendered below reuses
  // these results instead of repeating them.
  let blocked = false
  try {
    await resolveCompanyId()
  } catch (err) {
    blocked = err instanceof CompanyBlockedError
  }
  if (blocked) redirect('/suscripcion')

  const isDemo = isDemoEmail((await getSessionUser())?.email)

  // App shell: the outer container fills the viewport and never scrolls, so the
  // header + bottom nav stay pinned. Only <main> scrolls. This kills the iOS
  // rubber-band that made the header drift on slide-down.
  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar className="hidden md:flex fixed top-0 left-0 z-40" />
      {/* min-w-0 stops a wide child (e.g. action buttons) from stretching this
          flex column past the viewport and dragging content off to the right. */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        {isDemo && (
          <div className="flex items-center justify-center gap-3 bg-primary px-4 py-1.5 text-xs text-primary-foreground">
            <span>Estás en una demo · los datos se reinician cada día</span>
            <Link href="/contacto" className="font-semibold underline underline-offset-2 whitespace-nowrap">
              Quiero mi cuenta
            </Link>
          </div>
        )}
        <Header />
        {/* overflow-x-hidden: the page itself must never drift sideways. Any
            deliberately-scrollable strip (pipeline tabs, kanban lanes) owns its
            own overflow-x-auto and still scrolls inside this. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav className="fixed bottom-0 inset-x-0 flex md:hidden" />
      <ChatWidget />
    </div>
  )
}
