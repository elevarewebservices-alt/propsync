import { ChatPage } from '@/components/assistant/ChatPage'

export const metadata = { title: 'Asistente IA — PropSync' }

export default function AsistentePage() {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Asistente IA</h1>
        <p className="text-sm text-muted-foreground">
          Consulta estadísticas, gestiona propiedades e inicia campañas con lenguaje natural.
        </p>
      </div>
      <ChatPage />
    </div>
  )
}
