import Anthropic from '@anthropic-ai/sdk'
import { TOOLS, executeTool, buildSystemPrompt, type ToolContext } from './tools'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = process.env.ASSISTANT_MODEL || 'claude-haiku-4-5-20251001'

// Runs the agentic loop for one inbound message and returns the reply text.
// `history` is the prior conversation (already in Anthropic message format).
export async function runAssistant(
  history: Anthropic.MessageParam[],
  userText: string,
  ctx: ToolContext,
  agentName: string,
  agencyName: string,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(agentName, agencyName)

  // Prompt caching: tools + system are a static prefix re-sent each iteration.
  const cachedTools = TOOLS.map((t, i) =>
    i === TOOLS.length - 1 ? { ...t, cache_control: { type: 'ephemeral' as const } } : t,
  )
  const cachedSystem: Anthropic.TextBlockParam[] = [
    { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
  ]

  let messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: userText },
  ]

  const MAX_ITERATIONS = 8
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: cachedSystem,
      tools: cachedTools,
      messages,
    })

    if (response.stop_reason === 'tool_use') {
      messages = [...messages, { role: 'assistant', content: response.content }]
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        let result: unknown
        let isError = false
        try {
          result = await executeTool(block.name, block.input as Record<string, unknown>, ctx)
        } catch (err) {
          result = { error: err instanceof Error ? err.message : String(err) }
          isError = true
        }
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
          is_error: isError,
        })
      }
      messages = [...messages, { role: 'user', content: results }]
      continue
    }

    // Final answer
    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text : 'Disculpa, no entendí. ¿Me lo repites?'
  }

  return 'Estoy procesando tu solicitud, dame un momento y te respondo. 🙏'
}
