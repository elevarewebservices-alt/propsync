import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ChatWidget } from '@/components/assistant/ChatWidget'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // App shell: the outer container fills the viewport and never scrolls, so the
  // header + bottom nav stay pinned. Only <main> scrolls. This kills the iOS
  // rubber-band that made the header drift on slide-down.
  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar className="hidden md:flex fixed top-0 left-0 z-40" />
      {/* min-w-0 stops a wide child (e.g. action buttons) from stretching this
          flex column past the viewport and dragging content off to the right. */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />
        <main className="flex-1 overflow-y-auto overscroll-contain pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav className="fixed bottom-0 inset-x-0 flex md:hidden" />
      <ChatWidget />
    </div>
  )
}
