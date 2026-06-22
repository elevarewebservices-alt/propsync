import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId, isSessionOwner } from '@/lib/auth'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const HEADERS = [
  'nombre','tipo','telefono','whatsapp','email','pais','ciudad',
  'zona_interes','tipo_operacion','presupuesto_min','presupuesto_max',
  'fuente','meta_campaign','meta_form','etapa','agente_nombre',
  'fecha_seguimiento','notas','tags','created_at',
]

export async function GET(request: Request) {
  // Exporting the contact list is restricted to the account owner.
  if (!(await isSessionOwner())) {
    return Response.json(
      { error: 'Solo el propietario de la cuenta puede exportar contactos.' },
      { status: 403 }
    )
  }

  const companyId = await resolveCompanyId()
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')
  const tipo = searchParams.get('tipo')
  const format = searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv'

  const db = createAdminClient()
  let query = db
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (stage) query = query.eq('etapa_crm', stage)
  // When a specific tipo is requested, filter to it; otherwise the general
  // export covers leads/clients only — owners live in their own section.
  if (tipo) query = query.eq('tipo', tipo)
  else query = query.neq('tipo', 'propietario')

  const { data, error } = await (query as any)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = (data as any[] ?? []).map((c: any) => ({
    nombre: c.nombre,
    tipo: c.tipo,
    telefono: c.telefono ?? '',
    whatsapp: c.whatsapp ?? '',
    email: c.email ?? '',
    pais: c.pais ?? '',
    ciudad: c.ciudad ?? '',
    zona_interes: c.zona_interes ?? '',
    tipo_operacion: c.tipo_operacion ?? '',
    presupuesto_min: c.presupuesto_min ?? '',
    presupuesto_max: c.presupuesto_max ?? '',
    fuente: c.fuente,
    meta_campaign: c.meta_campaign ?? '',
    meta_form: c.meta_form ?? '',
    etapa: c.etapa_crm,
    agente_nombre: c.agente_nombre ?? '',
    fecha_seguimiento: c.fecha_seguimiento ?? '',
    notas: c.notas ?? '',
    tags: (c.tags ?? []).join(', '),
    created_at: c.created_at ? new Date(c.created_at).toLocaleDateString('es') : '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS })
  const colWidths = HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 15) }))
  ws['!cols'] = colWidths

  const date = new Date().toISOString().split('T')[0]
  const base = tipo === 'propietario' ? 'propietarios' : 'clientes'

  if (format === 'csv') {
    // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
    const csv = '﻿' + XLSX.utils.sheet_to_csv(ws)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${base}_propsync_${date}.csv"`,
      },
    })
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Contactos')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${base}_propsync_${date}.xlsx"`,
    },
  })
}
