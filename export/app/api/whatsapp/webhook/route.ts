import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendText, verifySignature, parseInbound } from '@/lib/whatsapp'
import { runAssistant } from '@/lib/assistant'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

// ── GET: Meta webhook verification handshake ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ── POST: inbound messages ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const raw = await req.text()

  // Verify the payload really came from Meta.
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const msg = parseInbound(JSON.parse(raw))
  // Always 200 quickly so Meta doesn't retry; non-text events are ignored.
  if (!msg) return NextResponse.json({ ok: true })

  // Process async-ish but return fast. (For scale, push to a queue instead.)
  try {
    await handleMessage(msg)
  } catch (err) {
    console.error('[webhook] handler error:', err)
  }
  return NextResponse.json({ ok: true })
}

async function handleMessage(msg: ReturnType<typeof parseInbound> & {}) {
  if (!msg) return
  const db = createAdminClient()

  // 1. Find the agent that owns this WhatsApp business number (multi-tenant).
  const { data: agent } = await (db.from('agents') as any)
    .select('id, nombre, agencia')
    .eq('whatsapp_phone_number_id', msg.phoneNumberId)
    .single()
  if (!agent) {
    console.error('[webhook] no agent for phone_number_id', msg.phoneNumberId)
    return
  }

  // 2. Upsert the lead (by phone, per agent).
  const { data: lead } = await (db.from('leads') as any)
    .upsert(
      { agent_id: agent.id, telefono: msg.from, nombre: msg.name ?? null },
      { onConflict: 'agent_id,telefono', ignoreDuplicates: false },
    )
    .select('id')
    .single()

  // 3. Load recent conversation history for context.
  const { data: history } = await (db.from('messages') as any)
    .select('role, content')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: true })
    .limit(20)

  const priorMessages: Anthropic.MessageParam[] = (history ?? []).map((m: any) => ({
    role: m.role,
    content: m.content,
  }))

  // 4. Save the inbound message.
  await (db.from('messages') as any).insert({
    lead_id: lead.id, agent_id: agent.id, role: 'user', content: msg.text,
  })

  // 5. Run the assistant.
  const reply = await runAssistant(
    priorMessages,
    msg.text,
    { agentId: agent.id, leadId: lead.id, leadPhone: msg.from },
    agent.nombre ?? 'tu agente',
    agent.agencia ?? '',
  )

  // 6. Save + send the reply.
  await (db.from('messages') as any).insert({
    lead_id: lead.id, agent_id: agent.id, role: 'assistant', content: reply,
  })
  await sendText(msg.from, reply)
}
