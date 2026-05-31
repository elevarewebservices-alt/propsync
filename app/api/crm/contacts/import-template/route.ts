import * as XLSX from 'xlsx'

const HEADERS = [
  'nombre','tipo','telefono','whatsapp','email','pais','ciudad',
  'zona_interes','tipo_operacion','presupuesto_min','presupuesto_max',
  'fuente','meta_campaign','meta_form','etapa','agente_nombre',
  'fecha_seguimiento','notas',
]

const SAMPLE_ROW = {
  nombre: 'Juan Pérez',
  tipo: 'cliente',
  telefono: '+50760000000',
  whatsapp: '+50760000000',
  email: 'juan@ejemplo.com',
  pais: 'Panamá',
  ciudad: 'Ciudad de Panamá',
  zona_interes: 'Punta Pacífica',
  tipo_operacion: 'compra',
  presupuesto_min: 150000,
  presupuesto_max: 300000,
  fuente: 'manual',
  meta_campaign: '',
  meta_form: '',
  etapa: 'nuevo_lead',
  agente_nombre: 'María López',
  fecha_seguimiento: '2026-06-01',
  notas: 'Interesado en apartamentos de 2 habitaciones',
}

const INSTRUCTIONS = [
  ['Campo', 'Requerido', 'Valores válidos', 'Descripción'],
  ['nombre', 'SÍ', 'Texto libre', 'Nombre completo del contacto'],
  ['tipo', 'SÍ', 'cliente / propietario / broker', 'Tipo de contacto'],
  ['telefono', 'No', '+507XXXXXXXX', 'Número con código de país'],
  ['whatsapp', 'No', '+507XXXXXXXX', 'Número de WhatsApp'],
  ['email', 'No', 'email@dominio.com', 'Correo electrónico'],
  ['pais', 'No', 'Texto libre', 'País (default: Panamá)'],
  ['ciudad', 'No', 'Texto libre', 'Ciudad'],
  ['zona_interes', 'No', 'Texto libre', 'Zona o barrio de interés'],
  ['tipo_operacion', 'No', 'compra / alquiler / ambas', 'Tipo de operación buscada'],
  ['presupuesto_min', 'No', 'Número', 'Presupuesto mínimo en USD'],
  ['presupuesto_max', 'No', 'Número', 'Presupuesto máximo en USD'],
  ['fuente', 'No', 'manual / referido / web_form / meta_leads / wasi', 'Origen del lead'],
  ['meta_campaign', 'No', 'Texto libre', 'Nombre de campaña Meta'],
  ['meta_form', 'No', 'Texto libre', 'Nombre del formulario Meta'],
  ['etapa', 'No', 'nuevo_lead / contactado / visita / oferta_negociando / cerrado / descartado / basurero', 'Etapa del pipeline'],
  ['agente_nombre', 'No', 'Texto libre', 'Nombre del agente asignado'],
  ['fecha_seguimiento', 'No', 'YYYY-MM-DD', 'Fecha de seguimiento (ej: 2026-06-01)'],
  ['notas', 'No', 'Texto libre', 'Notas internas'],
]

export async function GET() {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Template
  const ws = XLSX.utils.json_to_sheet([SAMPLE_ROW], { header: HEADERS })
  ws['!cols'] = HEADERS.map(() => ({ wch: 22 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Contactos')

  // Sheet 2: Instructions
  const wsInst = XLSX.utils.aoa_to_sheet(INSTRUCTIONS)
  wsInst['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 55 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_contactos_propsync.xlsx"',
    },
  })
}
