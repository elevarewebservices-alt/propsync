'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Contact, TipoOperacion } from '@/lib/types'
import { SectionCard, FieldRow } from './SectionCard'
import { X } from 'lucide-react'

interface Props {
  contact: Contact
  onUpdate: (updated: Contact) => void
}

function tagColor(tag: string): string {
  const colors = [
    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  ]
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffff
  return colors[hash % colors.length]
}

export function ContactInteresTab({ contact, onUpdate }: Props) {
  // ── Preferencias ──
  const [editPrefs, setEditPrefs] = useState(false)
  const [savingP, setSavingP]     = useState(false)
  const [savedP,  setSavedP]      = useState(false)
  const [prefErr, setPrefErr]     = useState('')

  const [op, setOp]               = useState<TipoOperacion>(contact.tipo_operacion)
  const [zona, setZona]           = useState(contact.zona_interes ?? '')
  const [ciudad, setCiudad]       = useState(contact.ciudad ?? '')
  const [pais, setPais]           = useState(contact.pais ?? '')
  const [pMin, setPMin]           = useState(contact.presupuesto_min?.toString() ?? '')
  const [pMax, setPMax]           = useState(contact.presupuesto_max?.toString() ?? '')

  // ── Etiquetas ──
  const [editTags, setEditTags] = useState(false)
  const [savingT, setSavingT]   = useState(false)
  const [savedT,  setSavedT]    = useState(false)
  const [tags, setTags]         = useState(contact.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    setOp(contact.tipo_operacion); setZona(contact.zona_interes ?? ''); setCiudad(contact.ciudad ?? '')
    setPais(contact.pais ?? '')
    setPMin(contact.presupuesto_min?.toString() ?? ''); setPMax(contact.presupuesto_max?.toString() ?? '')
    setTags(contact.tags ?? [])
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

  async function savePrefs() {
    setPrefErr('')
    if (pMin && pMax && parseFloat(pMin) > parseFloat(pMax)) {
      setPrefErr('El presupuesto mínimo no puede ser mayor al máximo'); return
    }
    setSavingP(true)
    try {
      const updated = await patch({
        tipo_operacion: op, zona_interes: zona || null, ciudad: ciudad || null, pais: pais || null,
        presupuesto_min: pMin ? parseFloat(pMin) : null,
        presupuesto_max: pMax ? parseFloat(pMax) : null,
      })
      if (updated) onUpdate(updated)
      setSavedP(true); setEditPrefs(false)
      setTimeout(() => setSavedP(false), 1500)
    } catch (e) {
      setPrefErr(e instanceof Error ? e.message : 'Error')
    } finally { setSavingP(false) }
  }

  async function saveTags() {
    setSavingT(true)
    try {
      const updated = await patch({ tags })
      if (updated) onUpdate(updated)
      setSavedT(true); setEditTags(false)
      setTimeout(() => setSavedT(false), 1500)
    } finally { setSavingT(false) }
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (!tags.includes(tag)) setTags((p) => [...p, tag])
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((p) => p.slice(0, -1))
    }
  }

  const opLabel: Record<TipoOperacion, string> = { compra: 'Compra', alquiler: 'Alquiler', ambas: 'Compra o alquiler' }
  const formatUSD = (n: number | null) => n === null ? null : `USD ${n.toLocaleString('en-US')}`
  const budgetText = (() => {
    if (contact.presupuesto_min && contact.presupuesto_max) return `${formatUSD(contact.presupuesto_min)} – ${formatUSD(contact.presupuesto_max)}`
    if (contact.presupuesto_min) return `desde ${formatUSD(contact.presupuesto_min)}`
    if (contact.presupuesto_max) return `hasta ${formatUSD(contact.presupuesto_max)}`
    return null
  })()

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionCard
        title="Preferencias inmobiliarias"
        subtitle="Qué busca el contacto"
        editing={editPrefs}
        saving={savingP}
        saved={savedP}
        onEdit={() => setEditPrefs(true)}
        onCancel={() => {
          setOp(contact.tipo_operacion); setZona(contact.zona_interes ?? ''); setCiudad(contact.ciudad ?? '')
          setPais(contact.pais ?? '')
          setPMin(contact.presupuesto_min?.toString() ?? ''); setPMax(contact.presupuesto_max?.toString() ?? '')
          setEditPrefs(false); setPrefErr('')
        }}
        onSave={savePrefs}
      >
        {!editPrefs ? (
          <div className="grid grid-cols-1">
            <FieldRow label="Operación"       value={opLabel[contact.tipo_operacion]} />
            <FieldRow label="País"            value={contact.pais} />
            <FieldRow label="Ciudad"          value={contact.ciudad} />
            <FieldRow label="Zona de interés" value={contact.zona_interes} />
            <FieldRow label="Presupuesto"     value={budgetText} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Operación</Label>
              <Select value={op} onValueChange={(v) => setOp(v as TipoOperacion)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="ambas">Ambas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">País</Label>
              <Input value={pais} onChange={(e) => setPais(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Ciudad</Label>
              <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Zona de interés</Label>
              <Input value={zona} onChange={(e) => setZona(e.target.value)} className="h-9" placeholder="Punta Pacífica, Costa del Este…" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Presupuesto mínimo (USD)</Label>
              <Input value={pMin} onChange={(e) => setPMin(e.target.value)} type="number" className="h-9" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Presupuesto máximo (USD)</Label>
              <Input value={pMax} onChange={(e) => setPMax(e.target.value)} type="number" className="h-9" placeholder="0" />
            </div>
            {prefErr && <p className="col-span-2 text-xs text-red-500">{prefErr}</p>}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Etiquetas"
        subtitle="Categoriza al contacto con palabras clave"
        editing={editTags}
        saving={savingT}
        saved={savedT}
        onEdit={() => setEditTags(true)}
        onCancel={() => { setTags(contact.tags ?? []); setEditTags(false); setTagInput('') }}
        onSave={saveTags}
      >
        {!editTags ? (
          (contact.tags ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground/70">Sin etiquetas. Añade alguna para clasificar este contacto.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((t) => (
                <span key={t} className={`text-xs px-2.5 py-1 rounded-full ${tagColor(t)}`}>{t}</span>
              ))}
            </div>
          )
        ) : (
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3 min-h-[1.5rem]">
              {tags.map((t) => (
                <span key={t} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tagColor(t)}`}>
                  {t}
                  <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="hover:opacity-70">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="h-9 text-sm"
              placeholder="Escribe y presiona Enter (ej: vip, urgente, inversionista)"
            />
          </div>
        )}
      </SectionCard>
    </div>
  )
}
