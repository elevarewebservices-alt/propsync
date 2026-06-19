import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const HEADERS = [
  'nombre','tipo','telefono','whatsapp','email','pais','ciudad',
  'zona_interes','tipo_operacion','presupuesto_min','presupuesto_max',
  'fuente','meta_campaign','meta_form','etapa','agente_nombre',
  'fecha_seguimiento','notas','tags','created_at',
]

export async function GET(request: Request) {
  const companyId = await resolveCompanyId()
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')
  const tipo = searchParams.get('tipo')

  const db = createAdminClient()
  let query = db
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (stage) query = query.eq('etapa_crm', stage)
  if (tipo) query = query.eq('tipo', tipo)

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

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Contactos')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const date = new Date().toISOString().split('T')[0]

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="contactos_propsync_${date}.xlsx"`,
    },
  })
}
