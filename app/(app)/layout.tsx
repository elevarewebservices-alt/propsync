import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ChatWidget } from '@/components/assistant/ChatWidget'
import { PwaInit } from '@/components/PwaInit'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <PwaInit />
      <Sidebar className="hidden md:flex fixed top-0 left-0 z-40" />
      <div className="flex flex-col flex-1 md:ml-64">
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
