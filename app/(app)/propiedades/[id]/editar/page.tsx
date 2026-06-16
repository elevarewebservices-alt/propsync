'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Upload, X, ImagePlus, Loader2, Sparkles, Lock } from 'lucide-react'
import Link from 'next/link'
import type { PropertyNote } from '@/lib/types'
import { resizeImageFile } from '@/lib/image-resize'

const PROPERTY_TYPES = [
  'Apartamento', 'Casa', 'Local Comercial', 'Oficina', 'Bodega',
  'Terreno', 'Finca', 'Hotel', 'Penthouse', 'Estudio',
]
const PROPERTY_CONDITIONS = ['Nuevo', 'Usado', 'En planos', 'En construcción', 'Remodelar']
const FEATURES_INTERNAL = [
  'Aire acondicionado', 'Calentador de agua', 'Closets empotrados', 'Cocina equipada',
  'Cuarto de servicio', 'Despensa', 'Jacuzzi / Bañera', 'Lavandería', 'Pisos de mármol',
  'Pisos de madera', 'Terraza privada', 'Vista al mar', 'Vista a la ciudad',
  'Bodega / Storage', 'Generador', 'Ascensor privado', 'Balcón', 'Amueblado',
]
const FEATURES_EXTERNAL = [
  'Acceso controlado', 'Área de juegos', 'Barbacoa / Parrillas', 'Business center',
  'Club house', 'Gimnasio', 'Lobby', 'Piscina comunitaria', 'Sauna / Spa',
  'Seguridad 24h', 'Servicio de portería', 'Salón social', 'Cancha de tenis / pádel',
  'Parqueadero de visitas', 'Pet friendly', 'Área verde',
]

export default function EditarPropiedadPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form state
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<'venta' | 'arriendo'>('venta')
  const [propertyType, setPropertyType] = useState('')
  const [condition, setCondition] = useState('')
  const [precio, setPrecio] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [maintenanceFee, setMaintenanceFee] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [zona, setZona] = useState('')
  const [address, setAddress] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [garages, setGarages] = useState('')
  const [area, setArea] = useState('')
  const [builtArea, setBuiltArea] = useState('')
  const [privateArea, setPrivateArea] = useState('')
  const [year, setYear] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [featuresInternal, setFeaturesInternal] = useState<string[]>([])
  const [featuresExternal, setFeaturesExternal] = useState<string[]>([])
  const [customInternalInput, setCustomInternalInput] = useState('')
  const [customExternalInput, setCustomExternalInput] = useState('')
  const [commType, setCommType] = useState<'percentage' | 'fixed'>('percentage')
  const [commValue, setCommValue] = useState('')
  const [commNotes, setCommNotes] = useState('')
  const [extCommType, setExtCommType] = useState<'percentage' | 'fixed'>('percentage')
  const [extCommValue, setExtCommValue] = useState('')
  const [extCommNotes, setExtCommNotes] = useState('')

  // Images: existing URLs + new File objects
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([])

  // Notes
  const [notes, setNotes] = useState<PropertyNote[]>([])
  const [newNote, setNewNote] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [meRes, propRes, notesRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch(`/api/properties/${id}`),
          fetch(`/api/properties/${id}/notes`),
        ])
        if (!propRes.ok) { setNotFound(true); return }
        const [me, prop, notesData] = await Promise.all([meRes.json(), propRes.json(), notesRes.ok ? notesRes.json() : Promise.resolve([])])
        setNotes(notesData as PropertyNote[])
        setCompanyId(me?.company?.id ?? null)

        setTitulo(prop.titulo ?? '')
        setTipo(prop.tipo ?? 'venta')
        setPropertyType(prop.property_type_label ?? '')
        setCondition(prop.property_condition_label ?? '')
        setPrecio(prop.precio ? String(prop.precio) : '')
        setCurrency(prop.iso_currency ?? 'USD')
        setMaintenanceFee(prop.maintenance_fee ? String(prop.maintenance_fee) : '')
        setCiudad(prop.ciudad ?? '')
        setZona(prop.zona ?? '')
        setAddress(prop.address ?? '')
        setBedrooms(prop.bedrooms != null ? String(prop.bedrooms) : '')
        setBathrooms(prop.bathrooms != null ? String(prop.bathrooms) : '')
        setGarages(prop.garages != null ? String(prop.garages) : '')
        setArea(prop.area ?? '')
        setBuiltArea(prop.built_area ?? '')
        setPrivateArea(prop.private_area ?? '')
        setYear(prop.building_date ?? '')
        setDescripcion(prop.descripcion ?? '')
        setFeaturesInternal(
          Array.isArray(prop.features_internal)
            ? prop.features_internal.map((f: any) => f.nombre ?? f)
            : []
        )
        setFeaturesExternal(
          Array.isArray(prop.features_external)
            ? prop.features_external.map((f: any) => f.nombre ?? f)
            : []
        )
        setCommType(prop.commission_type ?? 'percentage')
        setCommValue(prop.commission_value != null ? String(prop.commission_value) : '')
        setCommNotes(prop.commission_notes ?? '')
        setExtCommType(prop.ext_commission_type ?? 'percentage')
        setExtCommValue(prop.ext_commission_value != null ? String(prop.ext_commission_value) : '')
        setExtCommNotes(prop.ext_commission_notes ?? '')
        setExistingImages(Array.isArray(prop.gallery_urls) && prop.gallery_urls.length
          ? prop.gallery_urls
          : prop.main_image_url ? [prop.main_image_url] : [])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const total = existingImages.length + newImages.length
    const slots = Math.max(0, 20 - total)
    const added = files.slice(0, slots).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setNewImages((prev) => [...prev, ...added])
    e.target.value = ''
  }

  function removeExisting(idx: number) {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx))
  }

  function removeNew(idx: number) {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  function toggleFeature(list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, name: string) {
    setter((prev) => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
  }

  function addCustomFeature(input: string, setInput: React.Dispatch<React.SetStateAction<string>>, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) {
    const val = input.trim()
    if (val && !list.includes(val)) setter((prev) => [...prev, val])
    setInput('')
  }

  async function uploadNewImages(): Promise<string[]> {
    if (newImages.length === 0) return []
    const urls: string[] = []
    for (const img of newImages) {
      try {
        const resized = await resizeImageFile(img.file)
        const fd = new FormData()
        fd.append('file', resized)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!res.ok) continue
        const { url } = await res.json()
        if (url) urls.push(url)
      } catch { /* skip failed uploads */ }
    }
    return urls
  }

  async function handleGenerateDescription() {
    setGenerating(true)
    try {
      const res = await fetch('/api/properties/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, tipo, propertyType, condition, precio, currency, bedrooms, bathrooms, garages, area, builtArea, privateArea, year, ciudad, zona }),
      })
      if (res.ok) {
        const { description } = await res.json()
        setDescripcion(description)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) { setError('El título es requerido.'); return }
    if (!precio) { setError('El precio es requerido.'); return }
    if (!newNote.trim()) {
      setError('Debes agregar una nota explicando los cambios realizados.')
      noteRef.current?.focus()
      noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setError(null)
    setSaving(true)

    setUploading(true)
    const uploadedUrls = await uploadNewImages()
    setUploading(false)

    const allImages = [...existingImages, ...uploadedUrls]
    const forSale = tipo === 'venta'
    const forRent = tipo === 'arriendo'

    const payload = {
      titulo: titulo.trim(),
      tipo,
      for_sale: forSale,
      for_rent: forRent,
      property_type_label: propertyType || null,
      property_condition_label: condition || null,
      precio: parseFloat(precio) || 0,
      iso_currency: currency,
      sale_price: forSale ? parseFloat(precio) || null : null,
      rent_price: forRent ? parseFloat(precio) || null : null,
      maintenance_fee: maintenanceFee ? parseFloat(maintenanceFee) : null,
      ciudad: ciudad.trim() || null,
      zona: zona.trim() || null,
      address: address.trim() || null,
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      garages: garages ? parseInt(garages) : null,
      area: area || null,
      built_area: builtArea || null,
      private_area: privateArea || null,
      building_date: year.trim() || null,
      descripcion: descripcion.trim() || null,
      main_image_url: allImages[0] ?? null,
      gallery_urls: allImages,
      features_internal: featuresInternal.map(n => ({ id: n.toLowerCase().replace(/[^a-z0-9]/g, '_'), nombre: n })),
      features_external: featuresExternal.map(n => ({ id: n.toLowerCase().replace(/[^a-z0-9]/g, '_'), nombre: n })),
      commission_type: commValue ? commType : null,
      commission_value: commValue ? parseFloat(commValue) : null,
      commission_notes: commNotes.trim() || null,
      ext_commission_type: extCommValue ? extCommType : null,
      ext_commission_value: extCommValue ? parseFloat(extCommValue) : null,
      ext_commission_notes: extCommNotes.trim() || null,
    }

    const res = await fetch(`/api/properties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Error al guardar.')
      setSaving(false)
      return
    }

    // Post the mandatory note after a successful save
    await fetch(`/api/properties/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenido: newNote.trim() }),
    })

    router.push('/propiedades')
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Propiedad no encontrada.{' '}
        <Link href="/propiedades" className="text-blue-600 hover:underline">Volver</Link>
      </div>
    )
  }

  const totalImages = existingImages.length + newImages.length

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/propiedades" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Propiedades
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">Editar propiedad</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Editar propiedad</h1>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">{titulo}</p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Básico */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Información básica</h2>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Operación *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo((v ?? 'venta') as 'venta' | 'arriendo')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="arriendo">Arriendo / Alquiler</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de inmueble</Label>
              <Select value={propertyType} onValueChange={(v) => setPropertyType(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Estado del inmueble</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {PROPERTY_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Precio */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Precio</h2>
          <Separator />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="precio">Precio *</Label>
              <Input id="precio" type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v ?? 'USD')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="PAB">PAB B/.</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maintenance">Cuota de mantenimiento</Label>
            <Input id="maintenance" type="number" min="0" step="0.01" value={maintenanceFee} onChange={(e) => setMaintenanceFee(e.target.value)} placeholder="150" />
          </div>
        </section>

        {/* Ubicación */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Ubicación</h2>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input id="ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ciudad de Panamá" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zona">Zona / Barrio</Label>
              <Input id="zona" value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Marbella" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </section>

        {/* Detalles */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Detalles</h2>
          <Separator />
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Habitaciones</Label>
              <Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" />
            </div>
            <div className="space-y-1.5">
              <Label>Baños</Label>
              <Input type="number" min="0" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" />
            </div>
            <div className="space-y-1.5">
              <Label>Garajes</Label>
              <Input type="number" min="0" value={garages} onChange={(e) => setGarages(e.target.value)} placeholder="1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Área total (m²)</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="120" />
            </div>
            <div className="space-y-1.5">
              <Label>Área construida (m²)</Label>
              <Input value={builtArea} onChange={(e) => setBuiltArea(e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-1.5">
              <Label>Área privada (m²)</Label>
              <Input value={privateArea} onChange={(e) => setPrivateArea(e.target.value)} placeholder="85" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Año de construcción</Label>
            <Input type="number" min="1900" max={new Date().getFullYear()} value={year} onChange={(e) => setYear(e.target.value)} className="w-32" />
          </div>
        </section>

        {/* Características */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Características</h2>
          <Separator />
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3">Internas</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {FEATURES_INTERNAL.map((feat) => (
                <button key={feat} type="button" onClick={() => toggleFeature(featuresInternal, setFeaturesInternal, feat)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${featuresInternal.includes(feat) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : 'border-border bg-muted/40 text-muted-foreground hover:border-foreground/50 hover:text-foreground'}`}>
                  {feat}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={customInternalInput} onChange={(e) => setCustomInternalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFeature(customInternalInput, setCustomInternalInput, featuresInternal, setFeaturesInternal))}
                placeholder="Característica personalizada..." className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <button type="button" onClick={() => addCustomFeature(customInternalInput, setCustomInternalInput, featuresInternal, setFeaturesInternal)}
                className="px-3 py-2 text-xs font-medium rounded-md border border-input bg-muted hover:bg-muted/80">Agregar</button>
            </div>
            {featuresInternal.filter(f => !FEATURES_INTERNAL.includes(f)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {featuresInternal.filter(f => !FEATURES_INTERNAL.includes(f)).map((feat) => (
                  <button key={feat} type="button" onClick={() => toggleFeature(featuresInternal, setFeaturesInternal, feat)}
                    className="text-xs px-3 py-1.5 rounded-full border border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:border-red-500 hover:bg-red-50 hover:text-red-700 transition-colors">
                    {feat} ×
                  </button>
                ))}
              </div>
            )}
          </div>
          <Separator />
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3">Externas (amenidades)</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {FEATURES_EXTERNAL.map((feat) => (
                <button key={feat} type="button" onClick={() => toggleFeature(featuresExternal, setFeaturesExternal, feat)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${featuresExternal.includes(feat) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : 'border-border bg-muted/40 text-muted-foreground hover:border-foreground/50 hover:text-foreground'}`}>
                  {feat}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={customExternalInput} onChange={(e) => setCustomExternalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFeature(customExternalInput, setCustomExternalInput, featuresExternal, setFeaturesExternal))}
                placeholder="Amenidad personalizada..." className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <button type="button" onClick={() => addCustomFeature(customExternalInput, setCustomExternalInput, featuresExternal, setFeaturesExternal)}
                className="px-3 py-2 text-xs font-medium rounded-md border border-input bg-muted hover:bg-muted/80">Agregar</button>
            </div>
          </div>
        </section>

        {/* Descripción */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Descripción</h2>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleGenerateDescription} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
              {generating ? 'Generando...' : 'Generar con IA'}
            </Button>
          </div>
          <Separator />
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={6}
            placeholder="Describe la propiedad..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </section>

        {/* Comisiones */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Comisiones</h2>
            <Badge variant="secondary" className="text-xs">Opcional</Badge>
          </div>
          <Separator />
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Comisión empresa</p>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <Select value={commType} onValueChange={(v) => setCommType((v ?? 'percentage') as 'percentage' | 'fixed')}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto fijo</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min="0" step={commType === 'percentage' ? '0.1' : '1'} value={commValue} onChange={(e) => setCommValue(e.target.value)} placeholder={commType === 'percentage' ? 'Ej: 3' : 'Ej: 5000'} className="h-9" />
                <div />
              </div>
              <textarea value={commNotes} onChange={(e) => setCommNotes(e.target.value)} rows={2} placeholder="Observaciones (opcional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Comisión externa</p>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <Select value={extCommType} onValueChange={(v) => setExtCommType((v ?? 'percentage') as 'percentage' | 'fixed')}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto fijo</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min="0" step={extCommType === 'percentage' ? '0.1' : '1'} value={extCommValue} onChange={(e) => setExtCommValue(e.target.value)} placeholder={extCommType === 'percentage' ? 'Ej: 2' : 'Ej: 3000'} className="h-9" />
                <div />
              </div>
              <textarea value={extCommNotes} onChange={(e) => setExtCommNotes(e.target.value)} rows={2} placeholder="Observaciones (opcional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
          </div>
        </section>

        {/* Fotos */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Fotos</h2>
          <Separator />
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

          {totalImages === 0 ? (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors">
              <ImagePlus className="h-8 w-8" />
              <div className="text-center">
                <p className="text-sm font-medium">Agregar fotos</p>
                <p className="text-xs">PNG, JPG hasta 10 MB — máximo 20 fotos</p>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {existingImages.map((url, idx) => (
                  <div key={`e-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {idx === 0 && newImages.length === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white font-medium">Principal</span>
                    )}
                    <button type="button" onClick={() => removeExisting(idx)}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {newImages.map((img, idx) => (
                  <div key={`n-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border border-blue-300">
                    <img src={img.preview} alt="" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-blue-600/80 px-1.5 py-0.5 text-[10px] text-white font-medium">Nueva</span>
                    <button type="button" onClick={() => removeNew(idx)}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {totalImages < 20 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors">
                    <Upload className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalImages} foto{totalImages !== 1 ? 's' : ''}
                {newImages.length > 0 && ` · ${newImages.length} nueva${newImages.length !== 1 ? 's' : ''} por subir`}
              </p>
            </div>
          )}
        </section>

        {/* Notas internas */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Notas internas</h2>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Lock className="h-3 w-3" />
              <span>Requerida · No editable</span>
            </div>
          </div>
          <Separator />

          {/* Historial existente */}
          {notes.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 max-h-52 overflow-y-auto divide-y divide-border">
              {notes.map((n) => {
                const d = new Date(n.created_at)
                const sameYear = d.getFullYear() === new Date().getFullYear()
                const fecha = d.toLocaleDateString('es', { day: 'numeric', month: 'short', ...(!sameYear ? { year: 'numeric' } : {}) })
                const hora = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={n.id} className="px-3 py-2.5 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-foreground">{n.agent_nombre}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{fecha} · {hora}</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{n.contenido}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Nueva nota — requerida */}
          <div className="space-y-1.5">
            <Label htmlFor="nueva-nota" className="text-xs">
              Nueva nota <span className="text-red-500">*</span>
              <span className="ml-1 text-muted-foreground font-normal">(obligatoria para guardar cambios)</span>
            </Label>
            <textarea
              id="nueva-nota"
              ref={noteRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              placeholder="Describe los cambios realizados, motivo de la edición..."
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!newNote.trim() && error?.includes('nota') ? 'border-red-500 focus-visible:ring-red-400' : 'border-input'}`}
            />
            <p className="text-[11px] text-muted-foreground">
              Se guardará automáticamente junto con los cambios. No se puede eliminar ni modificar.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href="/propiedades">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-32" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploading ? 'Subiendo fotos...' : 'Guardando...'}
              </span>
            ) : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
