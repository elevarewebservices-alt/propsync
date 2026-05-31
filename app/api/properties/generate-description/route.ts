import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { resolveCompanyId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

const DEFAULT_PROMPT = `Eres un redactor profesional de bienes raíces de Panamá.
Genera una descripción atractiva y profesional en español para la siguiente propiedad.
Usa 3 párrafos: el primero debe destacar lo más atractivo y la ubicación, el segundo detallar las características principales (áreas, habitaciones, amenidades), y el tercero una llamada a la acción concisa.
Máximo 200 palabras. No uses asteriscos, bullets ni markdown — solo texto corrido.`

function buildPropertyDetails(body: Record<string, string>): string {
  const lines: string[] = ['Datos de la propiedad:']

  if (body.titulo) lines.push(`- Título: ${body.titulo}`)

  const tipoLabel = body.tipo === 'venta' ? 'en venta' : 'en alquiler'
  const parts = [body.propertyType, tipoLabel].filter(Boolean)
  if (parts.length) lines.push(`- Tipo: ${parts.join(' ')}`)

  if (body.precio) lines.push(`- Precio: ${body.currency ?? 'USD'} ${Number(body.precio).toLocaleString('en-US')}`)

  const roomParts: string[] = []
  if (body.bedrooms) roomParts.push(`${body.bedrooms} habitaciones`)
  if (body.bathrooms) roomParts.push(`${body.bathrooms} baños`)
  if (body.garages)   roomParts.push(`${body.garages} garajes`)
  if (roomParts.length) lines.push(`- ${roomParts.join(' | ')}`)

  const areaParts: string[] = []
  if (body.area)        areaParts.push(`Total: ${body.area} m²`)
  if (body.builtArea)   areaParts.push(`Construida: ${body.builtArea} m²`)
  if (body.privateArea) areaParts.push(`Privada: ${body.privateArea} m²`)
  if (areaParts.length) lines.push(`- Áreas — ${areaParts.join(' | ')}`)

  if (body.year) lines.push(`- Año de construcción: ${body.year}`)

  const locParts: string[] = []
  if (body.ciudad) locParts.push(body.ciudad)
  if (body.zona)   locParts.push(body.zona)
  if (locParts.length) lines.push(`- Ubicación: ${locParts.join(', ')}`)

  if (body.condition) lines.push(`- Condición: ${body.condition}`)

  return lines.join('\n')
}

export async function POST(req: Request) {
  try {
    const companyId = await resolveCompanyId()
    const db = createAdminClient()
    const body = await req.json() as Record<string, string>

    const { data: co } = await (db.from('companies') as any)
      .select('description_prompt_template')
      .eq('id', companyId)
      .single()

    const template: string = co?.description_prompt_template?.trim() || DEFAULT_PROMPT
    const propertyDetails = buildPropertyDetails(body)
    const fullPrompt = `${template}\n\n${propertyDetails}`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: fullPrompt }],
    })

    const description = (message.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ description })
  } catch (err) {
    console.error('generate-description error:', err)
    return NextResponse.json({ error: 'No se pudo generar la descripción.' }, { status: 500 })
  }
}
