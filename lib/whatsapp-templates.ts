/**
 * Meta WhatsApp Message Templates Management API
 * Docs: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
 *
 * Templates belong to the WhatsApp Business Account (WABA), not the phone
 * number, so requests here use businessAccountId — unlike lib/whatsapp.ts's
 * sendTextMessage/sendTemplate which send through phoneNumberId.
 */

const META_API_BASE = 'https://graph.facebook.com/v21.0'

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'IN_APPEAL' | 'PAUSED' | 'DISABLED'

export interface TemplateConfig {
  businessAccountId: string
  accessToken: string
}

export interface MessageTemplate {
  id: string
  name: string
  category: TemplateCategory
  language: string
  status: TemplateStatus
  components: TemplateComponentDef[]
  rejected_reason?: string
}

export interface TemplateComponentDef {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  text?: string
  buttons?: Array<{ type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'; text: string; url?: string; phone_number?: string }>
}

export interface CreateTemplateInput {
  name: string
  category: TemplateCategory
  language: string
  components: TemplateComponentDef[]
}

export interface TemplateApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function listTemplates(config: TemplateConfig): Promise<TemplateApiResult<MessageTemplate[]>> {
  try {
    const res = await fetch(
      `${META_API_BASE}/${config.businessAccountId}/message_templates?limit=100`,
      { headers: { Authorization: `Bearer ${config.accessToken}` } },
    )
    const json = await res.json()

    if (!res.ok) {
      return { success: false, error: json?.error?.message ?? `HTTP ${res.status}` }
    }

    return { success: true, data: json?.data ?? [] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function createTemplate(
  config: TemplateConfig,
  input: CreateTemplateInput,
): Promise<TemplateApiResult<{ id: string; status: TemplateStatus; category: TemplateCategory }>> {
  try {
    const res = await fetch(`${META_API_BASE}/${config.businessAccountId}/message_templates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        category: input.category,
        language: input.language,
        components: input.components,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      return { success: false, error: json?.error?.error_user_msg ?? json?.error?.message ?? `HTTP ${res.status}` }
    }

    return { success: true, data: json }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function deleteTemplate(
  config: TemplateConfig,
  name: string,
): Promise<TemplateApiResult<{ success: true }>> {
  try {
    const res = await fetch(
      `${META_API_BASE}/${config.businessAccountId}/message_templates?name=${encodeURIComponent(name)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${config.accessToken}` },
      },
    )
    const json = await res.json()

    if (!res.ok) {
      return { success: false, error: json?.error?.message ?? `HTTP ${res.status}` }
    }

    return { success: true, data: { success: true } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
