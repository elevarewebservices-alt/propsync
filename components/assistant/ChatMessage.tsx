'use client'

import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
}

export function ChatMessage({ role, content, isLoading }: ChatMessageProps) {
  const isAssistant = role === 'assistant'

  return (
    <div className={cn('flex gap-3 mb-4', isAssistant ? 'flex-row' : 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isAssistant
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
          isAssistant
            ? 'bg-muted text-foreground rounded-tl-sm'
            : 'bg-primary text-primary-foreground rounded-tr-sm'
        )}
      >
        {isLoading ? (
          <span className="flex gap-1 items-center h-5">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">{renderMarkdown(content)}</div>
        )}
      </div>
    </div>
  )
}

// Minimal markdown renderer: **bold**, *italic*, bullet lists
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const isBullet = /^[-*•]\s/.test(line)
    const processed = line
      // [texto](url) → enlace clickeable (procesar antes de *cursiva* para no romper la URL)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 underline hover:no-underline font-medium">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 rounded text-xs">$1</code>')

    return (
      <span key={i} className={isBullet ? 'block pl-3 before:content-["•"] before:mr-2' : 'block'}>
        <span dangerouslySetInnerHTML={{ __html: isBullet ? processed.replace(/^[-*•]\s/, '') : processed }} />
        {i < lines.length - 1 && !isBullet && <br />}
      </span>
    )
  })
}
