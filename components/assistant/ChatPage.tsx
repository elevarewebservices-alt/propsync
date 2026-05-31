'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SuggestedPrompts } from './SuggestedPrompts'

type Message = { role: 'user' | 'assistant'; content: string }

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error al conectar. Verifica que el servidor Python esté corriendo en localhost:8000.\n\n_${err instanceof Error ? err.message : 'Error desconocido'}_`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-background rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">PropSync AI</p>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Pensando…' : 'Listo para ayudarte'}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-2"
            onClick={() => setMessages([])}
          >
            <Trash2 className="w-4 h-4" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Hola, soy PropSync AI</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Puedo consultar estadísticas, gestionar propiedades, iniciar campañas de WhatsApp y procesar respuestas de propietarios. ¿En qué te ayudo?
              </p>
            </div>
            <div className="w-full mt-2">
              <SuggestedPrompts onSelect={sendMessage} />
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} />
            ))}
            {loading && <ChatMessage role="assistant" content="" isLoading />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={loading}
        placeholder="Escribe tu pregunta o instrucción… (Enter para enviar)"
      />
    </div>
  )
}
