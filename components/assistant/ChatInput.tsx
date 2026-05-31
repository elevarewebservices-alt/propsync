'use client'

import { useRef, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const value = ref.current?.value.trim()
    if (!value || disabled) return
    onSend(value)
    if (ref.current) {
      ref.current.value = ''
      ref.current.style.height = 'auto'
    }
  }

  function handleInput() {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 120)}px`
  }

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-background">
      <textarea
        ref={ref}
        rows={1}
        disabled={disabled}
        placeholder={placeholder ?? 'Pregúntame algo…'}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        className={cn(
          'flex-1 resize-none rounded-xl border border-input bg-muted px-3 py-2 text-sm',
          'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[38px] max-h-[120px] overflow-y-auto leading-snug'
        )}
      />
      <Button
        size="icon"
        onClick={submit}
        disabled={disabled}
        className="h-9 w-9 rounded-xl flex-shrink-0"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  )
}
