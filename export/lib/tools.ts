import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from './supabase'

// Context passed to every tool call so the bot stays scoped to one agent + lead.
export interface ToolContext {
  agentId: string
  leadId: string
  leadPhone: string
}

// ── System prompt ─────────────────────────────────────────────────────────────
export function buildSystemPrompt(agentName: string, agencyName: string): string {
  return `Eres el asistente de WhatsApp de ${agentName}${agencyName ? ` (${agencyName})` : ''}, agente de bienes raíces.
Atiendes a personas interesadas en propiedades, por WhatsApp, en español, de forma cálida y profesional.

TU TRABAJO:
1. Saluda y entiende qué busca la persona (comprar/alquilar, tipo de inmueble, zona, presupuesto).
2. A medida que te den datos, guárdalos con update_lead (no preguntes todo de golpe; conversa natural).
3. Busca propiedades que encajen con search_properties y compártelas (título, precio, zona + enlace si hay).
4. Si quieren ver una propiedad, agenda con schedule_visit y avisa que el agente confirmará.
5. Si piden hablar con una persona, o el lead está caliente, usa escalate_to_agent.
6. Responde dudas generales de inmobiliaria/zonas con tu conocimiento (aclara que precios son aproximados).

REGLAS:
- Mensajes CORTOS, como WhatsApp real. Sin párrafos largos. Usa saltos de línea.
- Nunca inventes propiedades: solo comparte lo que devuelva search_properties.
- No des datos de contacto del dueño ni comisiones.
- Sé útil pero busca siempre avanzar hacia una visita o dejar el lead listo para el agente.`
}

// ── Tool definitions ──────────────────────────────────────────────────────────
export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_lead',
    description: 'Guarda o actualiza lo que sabes del prospecto: nombre, tipo de operación (compra/alquiler), tipo de inmueble, zona, presupuesto. Llámala cada vez que obtengas un dato nuevo.',
    input_schema: {
      type: 'object',
      properties: {
        nombre:          { type: 'string' },
        tipo_operacion:  { type: 'string', description: '"compra" o "alquiler"' },
        tipo_inmueble:   { type: 'string', description: 'Apartamento, Casa, etc.' },
        zona:            { type: 'string' },
        presupuesto_max: { type: 'number' },
        notas:           { type: 'string', description: 'Algo relevante que dijo el lead' },
      },
      required: [],
    },
  },
  {
    name: 'search_properties',
    description: 'Busca propiedades disponibles que encajen con lo que pide el prospecto.',
    input_schema: {
      type: 'object',
      properties: {
        tipo_operacion: { type: 'string', description: '"venta" o "arriendo"' },
        zona:           { type: 'string' },
        presupuesto_max:{ type: 'number' },
        tipo_inmueble:  { type: 'string' },
        limit:          { type: 'number', description: 'Default 3' },
      },
      required: [],
    },
  },
  {
    name: 'schedule_visit',
    description: 'Registra que el prospecto quiere visitar una propiedad. Captura la propiedad y la fecha/hora preferida; el agente confirmará.',
    input_schema: {
      type: 'object',
      properties: {
        property_id: { type: 'string' },
        preferencia: { type: 'string', description: 'Fecha/hora que prefiere el lead (texto libre)' },
      },
      required: ['preferencia'],
    },
  },
  {
    name: 'escalate_to_agent',
    description: 'Marca el lead como caliente y notifica al agente humano para que tome la conversación.',
    input_schema: {
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Por qué se escala (ej: "quiere cerrar", "pidió hablar con persona")' },
      },
      required: ['motivo'],
    },
  },
]

// ── Tool executor ─────────────────────────────────────────────────────────────
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const db = createAdminClient()

  switch (name) {
    case 'update_lead': {
      const patch: Record<string, unknown> = {}
      for (const k of ['nombre', 'tipo_operacion', 'tipo_inmueble', 'zona', 'presupuesto_max', 'notas']) {
        if (input[k] !== undefined) patch[k] = input[k]
      }
      if (Object.keys(patch).length === 0) return { ok: true }
      const { error } = await (db.from('leads') as any).update(patch).eq('id', ctx.leadId)
      if (error) throw new Error(error.message)
      return { ok: true, saved: patch }
    }

    case 'search_properties': {
      let q = (db.from('properties') as any)
        .select('id, titulo, precio, tipo, zona, bedrooms, public_url')
        .eq('agent_id', ctx.agentId)
        .eq('disponibilidad', 'disponible')
        .limit(Number(input.limit ?? 3))
      if (input.tipo_operacion) q = q.eq('tipo', input.tipo_operacion)
      if (input.zona)           q = q.ilike('zona', `%${input.zona}%`)
      if (input.tipo_inmueble)  q = q.ilike('tipo_inmueble', `%${input.tipo_inmueble}%`)
      if (input.presupuesto_max) q = q.lte('precio', Number(input.presupuesto_max))
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return { properties: data ?? [], count: data?.length ?? 0 }
    }

    case 'schedule_visit': {
      const { error } = await (db.from('visits') as any).insert({
        agent_id: ctx.agentId,
        lead_id: ctx.leadId,
        property_id: input.property_id ?? null,
        preferencia: input.preferencia,
        status: 'pendiente',
      })
      if (error) throw new Error(error.message)
      // (Opcional) aquí también puedes notificar al agente por WhatsApp/email.
      return { ok: true, nota: 'Visita registrada; el agente confirmará.' }
    }

    case 'escalate_to_agent': {
      const { error } = await (db.from('leads') as any)
        .update({ estado: 'caliente', escalado: true, escalado_motivo: input.motivo })
        .eq('id', ctx.leadId)
      if (error) throw new Error(error.message)
      // (Opcional) notificar al agente humano aquí.
      return { ok: true, nota: 'Agente notificado.' }
    }

    default:
      throw new Error(`Herramienta desconocida: ${name}`)
  }
}
