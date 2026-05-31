'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Maximize2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SuggestedPrompts } from './SuggestedPrompts'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }

export function ChatWidget() {
  const [open, setOpen] = useState(false)
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
          content: `Error al conectar con el asistente. Verifica que el servidor esté corriendo.\n\n_${err instanceof Error ? err.message : 'Error desconocido'}_`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'flex items-center justify-center',
          'hover:scale-105 transition-transform',
          'md:bottom-6 md:right-6',
          open && 'opacity-0 pointer-events-none'
        )}
        aria-label="Abrir asistente"
      >
        <Bot className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-1.5rem)]',
          'bg-background border border-border rounded-2xl shadow-2xl',
          'flex flex-col overflow-hidden',
          'transition-all duration-300',
          open ? 'opacity-100 scale-100 h-[520px]' : 'opacity-0 scale-95 h-0 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <span className="font-semibold text-sm">PropSync AI</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/asistente" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-white/20">
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary-foreground hover:bg-white/20"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Hola, soy PropSync AI</p>
                <p className="text-xs text-muted-foreground mt-1">¿En qué te puedo ayudar hoy?</p>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} />
            ))
          )}
          {loading && <ChatMessage role="assistant" content="" isLoading />}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts when empty */}
        {messages.length === 0 && !loading && (
          <SuggestedPrompts onSelect={sendMessage} />
        )}

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>
    </>
  )
}
