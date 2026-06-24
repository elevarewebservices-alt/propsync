import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { ASSISTANT_TOOLS, buildSystemPrompt, executeTool } from '@/lib/assistant-tools'
import { ASSISTANT_LIMITS } from '@/lib/plans'
import { resolveCompanyId, getSessionPlan, getSessionAgent, getSessionPermissions } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ConversationMessage = Anthropic.MessageParam

export async function POST(req: NextRequest) {
  // Tracks whether we have consumed a credit, so we can refund it if the
  // request fails before delivering a response.
  let creditState: { companyId: string; month: string } | null = null
  const db = createAdminClient()

  try {
    const { messages }: { messages: ConversationMessage[] } = await req.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages requerido' }, { status: 400 })
    }

    // ── Auth + company context ──────────────────────────────────────────────
    // companyId, planId and month are all resolved server-side from the session.
    // The client cannot influence them, so the limit cannot be spoofed.
    const companyId = await resolveCompanyId()
    const planId    = await getSessionPlan()
    const month     = new Date().toISOString().slice(0, 7)   // 'YYYY-MM'
    const limit     = ASSISTANT_LIMITS[planId] ?? ASSISTANT_LIMITS.starter

    // The assistant must respect the same per-agent data scoping as the rest
    // of the app — a restricted agente asking the bot can't get answers
    // about properties/contacts they wouldn't see in the UI either.
    const agent       = await getSessionAgent()
    const permissions = await getSessionPermissions()
    const toolContext = { companyId, agentId: (agent as any)?.id ?? null, permissions }

    // ── Atomic credit reservation (tamper-proof) ────────────────────────────
    // Consume one credit BEFORE spending any tokens. The DB function serializes
    // concurrent requests, so exactly `limit` can ever succeed in a month.
    const { data: newCount, error: creditErr } = await (db as any).rpc(
      'consume_assistant_credit',
      { p_company_id: companyId, p_month: month }
    )

    if (creditErr || typeof newCount !== 'number') {
      // Fail closed: if we can't verify the limit, do not run the model.
      console.error('[assistant] credit guard failed:', creditErr)
      return NextResponse.json(
        { error: 'No se pudo verificar el límite de uso. Intenta más tarde.' },
        { status: 503 }
      )
    }
    creditState = { companyId, month }

    if (newCount > limit) {
      // Over the limit — give the credit back so the counter stays pegged at
      // `limit`, and block the request.
      await (db as any).rpc('refund_assistant_credit', { p_company_id: companyId, p_month: month })
      creditState = null
      return NextResponse.json({
        role: 'assistant',
        content: `Has alcanzado el límite de **${limit} consultas** este mes para tu plan **${planId}**. Actualiza tu plan para continuar usando el asistente IA.`,
      })
    }

    const { data: company } = await (db.from('companies') as any)
      .select('nombre')
      .eq('id', companyId)
      .single()

    // ── Agentic loop ────────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(company?.nombre ?? 'tu agencia')

    // Prompt caching: the tools + system prompt are a large static prefix that
    // gets re-sent on every iteration of the agentic loop (and on every message
    // of the conversation). Marking the end of that prefix with cache_control
    // makes calls after the first read it at ~10% of the input cost.
    const cachedTools = ASSISTANT_TOOLS.map((t, i) =>
      i === ASSISTANT_TOOLS.length - 1
        ? { ...t, cache_control: { type: 'ephemeral' as const } }
        : t
    )
    const cachedSystem: Anthropic.TextBlockParam[] = [
      { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
    ]

    let currentMessages: ConversationMessage[] = [...messages]
    let iterations      = 0
    const MAX_ITERATIONS = 12

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system:     cachedSystem,
        tools:      cachedTools,
        messages:   currentMessages,
      })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text')
        const text      = textBlock?.type === 'text' ? textBlock.text : ''

        // Credit was already consumed atomically up front — nothing to do here.
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
            result = await executeTool(block.name, block.input as Record<string, unknown>, toolContext)
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
    // Refund the reserved credit — the request failed before delivering value.
    if (creditState) {
      await (db as any)
        .rpc('refund_assistant_credit', {
          p_company_id: creditState.companyId,
          p_month: creditState.month,
        })
        .catch(() => {})
    }
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
