import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'
import * as XLSX from 'xlsx'

const VALID_TIPOS = ['cliente', 'propietario', 'broker']
const VALID_OPERACIONES = ['compra', 'alquiler', 'ambas']
const VALID_FUENTES = ['manual', 'meta_leads', 'web_form', 'referido', 'wasi']

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

interface ImportRow {
  row: number
  nombre: string
  tipo: string
  telefono: string
  whatsapp: string
  email: string
  pais: string
  ciudad: string
  zona_interes: string
  tipo_operacion: string
  presupuesto_min: string
  presupuesto_max: string
  fuente: string
  meta_campaign: string
  meta_form: string
  etapa: string
  agente_nombre: string
  fecha_seguimiento: string
  notas: string
}

export async function POST(request: Request) {
  const companyId = await resolveCompanyId()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') ?? 'validate'

  if (action === 'commit') {
    const body = await request.json()
    const rows: ImportRow[] = body.rows ?? []
    const db = createAdminClient()

    let imported = 0
    let skipped = 0

    for (const row of rows) {
      if (row.telefono) {
        const { count } = await db
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('telefono', row.telefono)

        if (count && count > 0) {
          skipped++
          continue
        }
      }

      const { error } = await (db.from('contacts') as any).insert({
        company_id: companyId,
        nombre: row.nombre,
        tipo: row.tipo || 'cliente',
        telefono: row.telefono || null,
        whatsapp: row.whatsapp || null,
        email: row.email || null,
        pais: row.pais || 'Panamá',
        ciudad: row.ciudad || null,
        zona_interes: row.zona_interes || null,
        tipo_operacion: row.tipo_operacion || 'compra',
        presupuesto_min: row.presupuesto_min ? parseFloat(row.presupuesto_min) : null,
        presupuesto_max: row.presupuesto_max ? parseFloat(row.presupuesto_max) : null,
        fuente: row.fuente || 'manual',
        meta_campaign: row.meta_campaign || null,
        meta_form: row.meta_form || null,
        etapa_crm: row.etapa || 'nuevo_lead',
        agente_nombre: row.agente_nombre || null,
        fecha_seguimiento: row.fecha_seguimiento || null,
        notas: row.notas || null,
        tags: [],
      })

      if (!error) imported++
      else skipped++
    }

    return Response.json({ imported, skipped })
  }

  // Validate phase
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

  const db = createAdminClient()
  const { data: stages } = await (db.from('crm_stages') as any)
    .select('slug')
    .eq('company_id', companyId)

  const validSlugs = new Set<string>((stages as any[] ?? []).map((s: any) => s.slug as string))

  const errors: { row: number; field: string; message: string }[] = []
  const validRows: (ImportRow & { row: number })[] = []

  rawRows.forEach((r, idx) => {
    const rowNum = idx + 2
    const rowErrors: { row: number; field: string; message: string }[] = []

    if (!r.nombre?.trim()) {
      rowErrors.push({ row: rowNum, field: 'nombre', message: 'El nombre es requerido' })
    }
    if (r.tipo && !VALID_TIPOS.includes(r.tipo)) {
      rowErrors.push({ row: rowNum, field: 'tipo', message: `Tipo inválido: "${r.tipo}". Use: ${VALID_TIPOS.join(' / ')}` })
    }
    if (r.email && !validateEmail(r.email)) {
      rowErrors.push({ row: rowNum, field: 'email', message: `Email inválido: "${r.email}"` })
    }
    if (r.tipo_operacion && !VALID_OPERACIONES.includes(r.tipo_operacion)) {
      rowErrors.push({ row: rowNum, field: 'tipo_operacion', message: `Operación inválida: "${r.tipo_operacion}". Use: ${VALID_OPERACIONES.join(' / ')}` })
    }
    if (r.fuente && !VALID_FUENTES.includes(r.fuente)) {
      rowErrors.push({ row: rowNum, field: 'fuente', message: `Fuente inválida: "${r.fuente}"` })
    }
    if (r.etapa && validSlugs.size > 0 && !validSlugs.has(r.etapa)) {
      rowErrors.push({ row: rowNum, field: 'etapa', message: `Etapa no existe: "${r.etapa}"` })
    }
    if (r.presupuesto_min && r.presupuesto_max) {
      const min = parseFloat(r.presupuesto_min)
      const max = parseFloat(r.presupuesto_max)
      if (!isNaN(min) && !isNaN(max) && min > max) {
        rowErrors.push({ row: rowNum, field: 'presupuesto_min', message: 'Presupuesto mínimo no puede ser mayor que el máximo' })
      }
    }

    errors.push(...rowErrors)
    if (rowErrors.length === 0) {
      validRows.push({ row: rowNum, ...r } as ImportRow & { row: number })
    }
  })

  return Response.json({
    total: rawRows.length,
    valid: validRows.length,
    errors,
    preview: validRows.slice(0, 5),
    rows: validRows,
  })
}
