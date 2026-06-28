import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ChatWidget } from '@/components/assistant/ChatWidget'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex fixed top-0 left-0 z-40" />
      {/* min-w-0 stops a wide child (e.g. action buttons) from stretching this
          flex column past the viewport and dragging content off to the right. */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav className="fixed bottom-0 inset-x-0 flex md:hidden" />
      <ChatWidget />
    </div>
  )
}
