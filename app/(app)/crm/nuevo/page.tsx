'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { CrmStage } from '@/lib/types'
import { ValidatedInput } from '@/components/shared/ValidatedInput'
import { isValidEmail, isValidPhone } from '@/lib/validation'

function NuevoContactoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPropietario = searchParams.get('tipo') === 'propietario'
  const backHref = isPropietario ? '/propietarios' : '/crm'
  const [stages, setStages] = useState<CrmStage[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // form fields
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState(isPropietario ? 'propietario' : 'cliente')
  const [telefono, setTelefono] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [zonaInteres, setZonaInteres] = useState('')
  const [tipoOperacion, setTipoOperacion] = useState('compra')
  const [presupuestoMin, setPresupuestoMin] = useState('')
  const [presupuestoMax, setPresupuestoMax] = useState('')
  const [etapa, setEtapa] = useState('nuevo_lead')
  const [agente, setAgente] = useState('')
  const [seguimiento, setSeguimiento] = useState('')
  const [fuente, setFuente] = useState('manual')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    fetch('/api/crm/stages')
      .then((r) => r.json())
      .then((data: CrmStage[]) => {
        setStages(data)
        if (data.length > 0) setEtapa(data[0].slug)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim())                              { setError('El nombre es requerido');                   return }
    if (email    && !isValidEmail(email))            { setError('Email no válido');                          return }
    if (telefono && !isValidPhone(telefono))         { setError('Teléfono no válido');                       return }
    if (whatsapp && !isValidPhone(whatsapp))         { setError('WhatsApp no válido');                       return }
    if (presupuestoMin && presupuestoMax && parseFloat(presupuestoMin) > parseFloat(presupuestoMax)) {
      setError('El presupuesto mínimo no puede ser mayor al máximo'); return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          tipo,
          telefono: telefono || null,
          whatsapp: whatsapp || null,
          email: email || null,
          ciudad: ciudad || null,
          zona_interes: zonaInteres || null,
          tipo_operacion: tipoOperacion,
          presupuesto_min: presupuestoMin ? parseFloat(presupuestoMin) : null,
          presupuesto_max: presupuestoMax ? parseFloat(presupuestoMax) : null,
          etapa_crm: etapa,
          agente_nombre: agente || null,
          fecha_seguimiento: seguimiento || null,
          fuente,
          notas: notas || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error al guardar')
      }
      setSaved(true)
      setTimeout(() => router.push(backHref), 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Regresar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{isPropietario ? 'Nuevo propietario' : 'Nuevo contacto'}</h1>
          <p className="text-sm text-muted-foreground">
            {isPropietario ? 'Ingresa la información del propietario' : 'Ingresa la información del nuevo contacto'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Básico */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Básico</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-sm mb-1.5 block">Nombre <span className="text-red-500">*</span></Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" className="h-9" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v ?? 'cliente')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="propietario">Propietario</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Teléfono</Label>
              <ValidatedInput variant="phone" value={telefono} onChange={setTelefono} className="h-9" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">WhatsApp</Label>
              <ValidatedInput variant="phone" value={whatsapp} onChange={setWhatsapp} className="h-9" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Email</Label>
              <ValidatedInput variant="email" value={email} onChange={setEmail} className="h-9" />
            </div>
          </div>
        </section>

        {/* Interés inmobiliario */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Interés Inmobiliario</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1.5 block">Operación</Label>
              <Select value={tipoOperacion} onValueChange={(v) => setTipoOperacion(v ?? 'compra')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="ambas">Ambas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Ciudad</Label>
              <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-sm mb-1.5 block">Zona de interés</Label>
              <Input value={zonaInteres} onChange={(e) => setZonaInteres(e.target.value)} placeholder="Ej: Punta Pacífica, Costa del Este…" className="h-9" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Presupuesto mínimo</Label>
              <Input value={presupuestoMin} onChange={(e) => setPresupuestoMin(e.target.value)} type="number" placeholder="USD" className="h-9" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Presupuesto máximo</Label>
              <Input value={presupuestoMax} onChange={(e) => setPresupuestoMax(e.target.value)} type="number" placeholder="USD" className="h-9" />
            </div>
          </div>
        </section>

        {/* Asignación */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Asignación</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1.5 block">Etapa</Label>
              <Select value={etapa} onValueChange={(v) => setEtapa(v ?? 'nuevo_lead')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Agente asignado</Label>
              <Input value={agente} onChange={(e) => setAgente(e.target.value)} placeholder="Nombre del agente" className="h-9" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Fecha de seguimiento</Label>
              <Input value={seguimiento} onChange={(e) => setSeguimiento(e.target.value)} type="date" className="h-9" />
            </div>
          </div>
        </section>

        {/* Fuente */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Fuente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1.5 block">Origen del lead</Label>
              <Select value={fuente} onValueChange={(v) => setFuente(v ?? 'manual')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="referido">Referido</SelectItem>
                  <SelectItem value="web_form">Formulario web</SelectItem>
                  <SelectItem value="meta_leads">Meta / Facebook</SelectItem>
                  <SelectItem value="wasi">Wasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-sm mb-1.5 block">Notas</Label>
              <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className="resize-none text-sm" placeholder="Información adicional…" />
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Link href={backHref}>
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving || saved}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            ) : null}
            {saved ? 'Guardado' : 'Guardar contacto'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NuevoContactoPage() {
  return (
    <Suspense>
      <NuevoContactoForm />
    </Suspense>
  )
}
