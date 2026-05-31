import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { ASSISTANT_TOOLS, buildSystemPrompt, executeTool } from '@/lib/assistant-tools'
import { ASSISTANT_LIMITS } from '@/lib/plans'
import { resolveCompanyId, getSessionPlan } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ConversationMessage = Anthropic.MessageParam

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: ConversationMessage[] } = await req.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages requerido' }, { status: 400 })
    }

    // ── Auth + company context ──────────────────────────────────────────────
    const companyId = await resolveCompanyId()
    const planId    = await getSessionPlan()
    const db        = createAdminClient()

    const { data: company } = await (db.from('companies') as any)
      .select('nombre')
      .eq('id', companyId)
      .single()

    // ── Usage limit check ───────────────────────────────────────────────────
    const month = new Date().toISOString().slice(0, 7)   // 'YYYY-MM'
    const { data: usage } = await (db.from('assistant_usage') as any)
      .select('request_count')
      .eq('company_id', companyId)
      .eq('month', month)
      .maybeSingle()

    const currentCount = (usage as any)?.request_count ?? 0
    const limit        = ASSISTANT_LIMITS[planId] ?? ASSISTANT_LIMITS.starter

    if (currentCount >= limit) {
      return NextResponse.json({
        role: 'assistant',
        content: `Has alcanzado el límite de **${limit} consultas** este mes para tu plan **${planId}**. Actualiza tu plan para continuar usando el asistente IA.`,
      })
    }

    // ── Agentic loop ────────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(company?.nombre ?? 'tu agencia')
    let currentMessages: ConversationMessage[] = [...messages]
    let iterations      = 0
    const MAX_ITERATIONS = 12

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system:     systemPrompt,
        tools:      ASSISTANT_TOOLS,
        messages:   currentMessages,
      })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text')
        const text      = textBlock?.type === 'text' ? textBlock.text : ''

        // ── Increment usage counter ─────────────────────────────────────────
        await (db.from('assistant_usage') as any)
          .upsert(
            { company_id: companyId, month, request_count: currentCount + 1 },
            { onConflict: 'company_id,month' }
          )

        return NextResponse.json({ role: 'assistant', content: text })
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')

        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.content },
        ]

        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const block of toolUseBlocks) {
          if (block.type !== 'tool_use') continue

          let result: unknown
          let isError = false

          try {
            result = await executeTool(block.name, block.input as Record<string, unknown>, companyId)
          } catch (err) {
            result  = { error: err instanceof Error ? err.message : String(err) }
            isError = true
          }

          toolResults.push({
            type:        'tool_result',
            tool_use_id: block.id,
            content:     JSON.stringify(result),
            is_error:    isError,
          })
        }

        currentMessages = [
          ...currentMessages,
          { role: 'user', content: toolResults },
        ]

        continue
      }

      // Any other stop_reason
      const textBlock = response.content.find(b => b.type === 'text')
      const text      = textBlock?.type === 'text' ? textBlock.text : 'Sin respuesta.'
      return NextResponse.json({ role: 'assistant', content: text })
    }

    return NextResponse.json({
      role:    'assistant',
      content: 'Se alcanzó el límite de iteraciones. Por favor intenta de nuevo.',
    })

  } catch (err) {
    console.error('[assistant] Error:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
