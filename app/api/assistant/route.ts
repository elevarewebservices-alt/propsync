import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { ASSISTANT_TOOLS, buildSystemPrompt, executeTool, OUT_OF_SCOPE_REPLY } from '@/lib/assistant-tools'
import { ASSISTANT_LIMITS } from '@/lib/plans'
import { resolveCompanyId, getSessionPlan, getSessionAgent, getSessionPermissions } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ConversationMessage = Anthropic.MessageParam

// The client re-sends the whole conversation on every turn, so input tokens grow
// without bound on a long thread. Keep the most recent turns only — the system
// prompt carries the standing instructions, and older small talk contributes far
// more cost than context. Trimming from the start keeps the newest exchange.
//
// Safe because both consumers (ChatWidget, ChatPage) persist plain text turns
// only; tool_use/tool_result blocks live inside a single request and never reach
// the client, so trimming can't orphan a tool_use block.
const MAX_HISTORY_MESSAGES = 20

function trimHistory(messages: ConversationMessage[]): ConversationMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages
  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES)
  // The window must start on a user turn — the API rejects a leading assistant
  // message, and a dangling assistant reply has no question attached anyway.
  while (trimmed.length && trimmed[0].role !== 'user') trimmed.shift()
  // Both UIs always send a user message last, so the loop normally stops there.
  // A hand-rolled caller could pass assistant-only turns and empty the window,
  // which would then be rejected as `messages: []` — fall back to the tail.
  return trimmed.length ? trimmed : messages.slice(-1)
}

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

    let currentMessages: ConversationMessage[] = trimHistory(messages)
    let iterations      = 0
    const MAX_ITERATIONS = 12

    // Refunds the credit reserved up front. Used whenever the turn ends without
    // delivering real value, so the user isn't billed a monthly consulta for it.
    const refund = async () => {
      if (!creditState) return
      await (db as any)
        .rpc('refund_assistant_credit', { p_company_id: creditState.companyId, p_month: creditState.month })
        .catch(() => {})
      creditState = null
    }

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

        // An out-of-scope question is answered from a fixed string with no tool
        // calls and almost no tokens. Charging a monthly consulta for "what's
        // the weather" is the fastest way to burn a user's quota on nothing, so
        // give the credit back. Compared on a normalised prefix because the
        // model occasionally varies trailing whitespace/punctuation.
        const norm = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 80)
        if (norm(text) === norm(OUT_OF_SCOPE_REPLY)) await refund()

        return NextResponse.json({ role: 'assistant', content: text })
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.content },
        ]

        // Run every tool the model asked for concurrently. They were executed
        // one after another before, so a turn requesting three lookups paid the
        // sum of three DB round trips while the user watched a spinner; they're
        // independent, so the turn now costs the slowest one instead.
        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (block): Promise<Anthropic.ToolResultBlockParam> => {
            let result: unknown
            let isError = false

            try {
              result = await executeTool(block.name, block.input as Record<string, unknown>, toolContext)
            } catch (err) {
              result  = { error: err instanceof Error ? err.message : String(err) }
              isError = true
            }

            return {
              type:        'tool_result',
              tool_use_id: block.id,
              content:     JSON.stringify(result),
              is_error:    isError,
            }
          })
        )

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

    // Hit the iteration ceiling without producing an answer. The user got
    // nothing usable and is about to retry, so don't charge them for it.
    await refund()
    return NextResponse.json({
      role:    'assistant',
      content: 'Se alcanzó el límite de iteraciones. Por favor intenta de nuevo, si puedes con una pregunta más concreta.',
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
