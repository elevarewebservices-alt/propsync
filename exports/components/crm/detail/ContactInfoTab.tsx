'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ValidatedInput } from '@/components/shared/ValidatedInput'
import { Contact } from '@/lib/types'
import { SectionCard, FieldRow } from './SectionCard'
import { isValidEmail, isValidPhone } from '@/lib/validation'

interface Props {
  contact: Contact
  onUpdate: (updated: Contact) => void
}

export function ContactInfoTab({ contact, onUpdate }: Props) {
  // ── Identidad section ──
  const [editIdentity, setEditIdentity] = useState(false)
  const [savingId, setSavingId]   = useState(false)
  const [savedId, setSavedId]     = useState(false)
  const [identityErr, setIdentityErr] = useState('')

  const [nombre, setNombre] = useState(contact.nombre)
  const [tipo, setTipo]     = useState(contact.tipo)

  // ── Comunicación section ──
  const [editComm, setEditComm] = useState(false)
  const [savingC, setSavingC]   = useState(false)
  const [savedC, setSavedC]     = useState(false)
  const [commErr, setCommErr]   = useState('')

  const [email, setEmail]       = useState(contact.email ?? '')
  const [telefono, setTelefono] = useState(contact.telefono ?? '')
  const [whatsapp, setWhatsapp] = useState(contact.whatsapp ?? '')

  // ── Asignación section ──
  const [editAssign, setEditAssign] = useState(false)
  const [savingA, setSavingA]   = useState(false)
  const [savedA, setSavedA]     = useState(false)

  const [agente, setAgente]           = useState(contact.agente_nombre ?? '')
  const [seguimiento, setSeguimiento] = useState(contact.fecha_seguimiento ?? '')

  // Reset internal state whenever the parent's contact changes
  useEffect(() => {
    setNombre(contact.nombre); setTipo(contact.tipo)
    setEmail(contact.email ?? ''); setTelefono(contact.telefono ?? ''); setWhatsapp(contact.whatsapp ?? '')
    setAgente(contact.agente_nombre ?? ''); setSeguimiento(contact.fecha_seguimiento ?? '')
  }, [contact])

  async function patch(body: Record<string, unknown>): Promise<Contact | null> {
    const res = await fetch(`/api/crm/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({ error: 'Error al guardar' }))
      throw new Error(d.error ?? 'Error al guardar')
    }
    return res.json()
  }

  async function saveIdentity() {
    setIdentityErr('')
    if (!nombre.trim()) { setIdentityErr('El nombre es requerido'); return }
    setSavingId(true)
    try {
      const updated = await patch({ nombre, tipo })
      if (updated) onUpdate(updated)
      setSavedId(true); setEditIdentity(false)
      setTimeout(() => setSavedId(false), 1500)
    } catch (e) {
      setIdentityErr(e instanceof Error ? e.message : 'Error')
    } finally { setSavingId(false) }
  }

  async function saveComm() {
    setCommErr('')
    if (email    && !isValidEmail(email))    { setCommErr('Email no válido');    return }
    if (telefono && !isValidPhone(telefono)) { setCommErr('Teléfono no válido'); return }
    if (whatsapp && !isValidPhone(whatsapp)) { setCommErr('WhatsApp no válido'); return }
    setSavingC(true)
    try {
      const updated = await patch({ email: email || null, telefono: telefono || null, whatsapp: whatsapp || null })
      if (updated) onUpdate(updated)
      setSavedC(true); setEditComm(false)
      setTimeout(() => setSavedC(false), 1500)
    } catch (e) {
      setCommErr(e instanceof Error ? e.message : 'Error')
    } finally { setSavingC(false) }
  }

  async function saveAssign() {
    setSavingA(true)
    try {
      const updated = await patch({ agente_nombre: agente || null, fecha_seguimiento: seguimiento || null })
      if (updated) onUpdate(updated)
      setSavedA(true); setEditAssign(false)
      setTimeout(() => setSavedA(false), 1500)
    } finally { setSavingA(false) }
  }

  const tipoLabel: Record<string, string> = { cliente: 'Cliente', propietario: 'Propietario', broker: 'Broker' }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* ── Identidad ──────────────────────────────────────────────── */}
      <SectionCard
        title="Identidad"
        subtitle="Datos básicos del contacto"
        editing={editIdentity}
        saving={savingId}
        saved={savedId}
        onEdit={() => setEditIdentity(true)}
        onCancel={() => {
          setNombre(contact.nombre); setTipo(contact.tipo); setEditIdentity(false); setIdentityErr('')
        }}
        onSave={saveIdentity}
      >
        {!editIdentity ? (
          <div className="grid grid-cols-1">
            <FieldRow label="Nombre" value={contact.nombre} />
            <FieldRow label="Tipo"   value={tipoLabel[contact.tipo]} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Nombre completo</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Tipo de contacto</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="propietario">Propietario</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {identityErr && <p className="col-span-2 text-xs text-red-500">{identityErr}</p>}
          </div>
        )}
      </SectionCard>

      {/* ── Comunicación ───────────────────────────────────────────── */}
      <SectionCard
        title="Comunicación"
        subtitle="Email y teléfonos verificados"
        editing={editComm}
        saving={savingC}
        saved={savedC}
        onEdit={() => setEditComm(true)}
        onCancel={() => {
          setEmail(contact.email ?? ''); setTelefono(contact.telefono ?? ''); setWhatsapp(contact.whatsapp ?? '')
          setEditComm(false); setCommErr('')
        }}
        onSave={saveComm}
      >
        {!editComm ? (
          <div className="grid grid-cols-1">
            <FieldRow label="Email"    value={contact.email} />
            <FieldRow label="Teléfono" value={contact.telefono} />
            <FieldRow label="WhatsApp" value={contact.whatsapp} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Email</Label>
              <ValidatedInput variant="email" value={email} onChange={setEmail} className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Teléfono</Label>
              <ValidatedInput variant="phone" value={telefono} onChange={setTelefono} className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">WhatsApp</Label>
              <ValidatedInput variant="phone" value={whatsapp} onChange={setWhatsapp} className="h-9" />
            </div>
            {commErr && <p className="col-span-2 text-xs text-red-500">{commErr}</p>}
          </div>
        )}
      </SectionCard>

      {/* ── Asignación ─────────────────────────────────────────────── */}
      <SectionCard
        title="Asignación"
        subtitle="Agente responsable y próxima fecha de contacto"
        editing={editAssign}
        saving={savingA}
        saved={savedA}
        onEdit={() => setEditAssign(true)}
        onCancel={() => {
          setAgente(contact.agente_nombre ?? ''); setSeguimiento(contact.fecha_seguimiento ?? '')
          setEditAssign(false)
        }}
        onSave={saveAssign}
      >
        {!editAssign ? (
          <div className="grid grid-cols-1">
            <FieldRow label="Agente" value={contact.agente_nombre} />
            <FieldRow
              label="Seguimiento"
              value={contact.fecha_seguimiento ? new Date(contact.fecha_seguimiento + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Agente asignado</Label>
              <Input value={agente} onChange={(e) => setAgente(e.target.value)} className="h-9" placeholder="Nombre del agente" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Fecha de seguimiento</Label>
              <Input value={seguimiento} onChange={(e) => setSeguimiento(e.target.value)} type="date" className="h-9" />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Origen — read-only metadata ───────────────────────────── */}
      <SectionCard
        title="Origen"
        subtitle="Información del registro (no editable)"
        editing={false}
        readOnly
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
      >
        <div className="grid grid-cols-1">
          <FieldRow label="Fuente" value={
            <span className="capitalize">{contact.fuente.replace('_', ' ')}</span>
          } />
          <FieldRow
            label="Registrado"
            value={
              <span className="inline-flex items-center gap-1.5">
                {new Date(contact.created_at).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })}
                <span className="text-[10px] text-muted-foreground/70">· campo permanente</span>
              </span>
            }
          />
          <FieldRow
            label="Actualizado"
            value={new Date(contact.updated_at).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })}
          />
          {contact.fuente === 'meta_leads' && (
            <>
              <FieldRow label="Campaña Meta" value={contact.meta_campaign} />
              <FieldRow label="Formulario"   value={contact.meta_form} />
              <FieldRow label="Ad Set"       value={contact.meta_ad_set} />
            </>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
