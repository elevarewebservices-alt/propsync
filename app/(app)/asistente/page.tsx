import { ChatPage } from '@/components/assistant/ChatPage'

export const metadata = { title: 'Asistente IA — PropSync' }

export default function AsistentePage() {
  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      {/* On a phone the chat should start right away — the page title and its
          strapline just pushed the conversation below the fold. */}
      <div className="hidden md:block mb-4">
        <h1 className="text-2xl font-bold">Asistente IA</h1>
        <p className="text-sm text-muted-foreground">
          Consulta estadísticas, gestiona propiedades e inicia campañas con lenguaje natural.
        </p>
      </div>
      <ChatPage />
    </div>
  )
}
