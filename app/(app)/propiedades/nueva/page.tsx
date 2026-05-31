'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Contact } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Upload, X, ImagePlus, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

const PROPERTY_TYPES = [
  'Apartamento', 'Casa', 'Local Comercial', 'Oficina', 'Bodega',
  'Terreno', 'Finca', 'Hotel', 'Penthouse', 'Estudio',
]

const PROPERTY_CONDITIONS = ['Nuevo', 'Usado', 'En planos', 'En construcción', 'Remodelar']

const FEATURES_INTERNAL = [
  'Aire acondicionado', 'Calentador de agua', 'Closets empotrados',
  'Cocina equipada', 'Cuarto de servicio', 'Despensa',
  'Jacuzzi / Bañera', 'Lavandería', 'Pisos de mármol',
  'Pisos de madera', 'Terraza privada', 'Vista al mar',
  'Vista a la ciudad', 'Bodega / Storage', 'Generador',
  'Ascensor privado', 'Balcón', 'Amueblado',
]

const FEATURES_EXTERNAL = [
  'Acceso controlado', 'Área de juegos', 'Barbacoa / Parrillas',
  'Business center', 'Club house', 'Gimnasio', 'Lobby',
  'Piscina comunitaria', 'Sauna / Spa', 'Seguridad 24h',
  'Servicio de portería', 'Salón social', 'Cancha de tenis / pádel',
  'Parqueadero de visitas', 'Pet friendly', 'Área verde',
]

export default function NuevaPropiedadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  // Load company ID on mount
  useEffect(() => {
    const loadCompanyId = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setCompanyId(data.company?.id)
        }
      } catch (err) {
        console.error('Error loading company ID:', err)
      }
    }
    loadCompanyId()
  }, [])

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
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Features
  const [featuresInternal, setFeaturesInternal] = useState<string[]>([])
  const [featuresExternal, setFeaturesExternal] = useState<string[]>([])
  const [customInternalInput, setCustomInternalInput] = useState('')
  const [customExternalInput, setCustomExternalInput] = useState('')

  // Commissions
  const [commType, setCommType] = useState<'percentage' | 'fixed'>('percentage')
  const [commValue, setCommValue] = useState('')
  const [commNotes, setCommNotes] = useState('')
  const [extCommType, setExtCommType] = useState<'percentage' | 'fixed'>('percentage')
  const [extCommValue, setExtCommValue] = useState('')
  const [extCommNotes, setExtCommNotes] = useState('')

  // Owner / propietario
  const [ownerContactId, setOwnerContactId] = useState<string | null>(null)
  const [ownerNombre, setOwnerNombre] = useState('')
  const [ownerApellido, setOwnerApellido] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerTelefono1, setOwnerTelefono1] = useState('')
  const [ownerTelefono2, setOwnerTelefono2] = useState('')
  const [ownerSuggestions, setOwnerSuggestions] = useState<Contact[]>([])
  const [ownerSearching, setOwnerSearching] = useState(false)
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false)
  const [phone1Warn, setPhone1Warn] = useState(false)
  const [phone2Warn, setPhone2Warn] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setImages((prev) => [...prev, ...newImages].slice(0, 20))
    e.target.value = ''
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  useEffect(() => {
    const q = `${ownerNombre} ${ownerApellido}`.trim()
    if (q.length < 2) { setOwnerSuggestions([]); return }
    const timer = setTimeout(async () => {
      setOwnerSearching(true)
      const res = await fetch(`/api/crm/contacts?search=${encodeURIComponent(q)}&tipo=propietario&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setOwnerSuggestions(data.contacts ?? [])
        setShowOwnerDropdown(true)
      }
      setOwnerSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [ownerNombre, ownerApellido])

  function selectOwnerContact(contact: Contact) {
    const parts = contact.nombre.split(' ')
    setOwnerNombre(parts[0] ?? '')
    setOwnerApellido(parts.slice(1).join(' '))
    setOwnerEmail(contact.email ?? '')
    setOwnerTelefono1(contact.telefono ?? '')
    setOwnerTelefono2(contact.whatsapp ?? '')
    setOwnerContactId(contact.id)
    setShowOwnerDropdown(false)
    setOwnerSuggestions([])
  }

  function clearOwnerContact() {
    setOwnerContactId(null)
    setOwnerNombre('')
    setOwnerApellido('')
    setOwnerEmail('')
    setOwnerTelefono1('')
    setOwnerTelefono2('')
    setPhone1Warn(false)
    setPhone2Warn(false)
  }

  async function checkPhoneDuplicate(phone: string, setter: (v: boolean) => void) {
    if (!phone.trim()) { setter(false); return }
    const res = await fetch(`/api/crm/contacts?search=${encodeURIComponent(phone)}&limit=5`)
    if (!res.ok) return
    const data = await res.json()
    const duplicate = (data.contacts as Contact[]).some(
      c => (c.telefono === phone || c.whatsapp === phone) && c.id !== ownerContactId
    )
    setter(duplicate)
  }

  function toggleFeature(list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, name: string) {
    setter((prev) => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
  }

  function addCustomFeature(input: string, setInput: React.Dispatch<React.SetStateAction<string>>, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) {
    const val = input.trim()
    if (val && !list.includes(val)) setter((prev) => [...prev, val])
    setInput('')
  }

  function removeCustomFeature(list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, name: string) {
    setter((prev) => prev.filter(x => x !== name))
  }

  async function uploadImages(): Promise<string[]> {
    if (!companyId) {
      console.error('Company ID not loaded')
      return []
    }

    const urls: string[] = []
    for (const img of images) {
      try {
        // Step 1: Get presigned upload URL
        const presignRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: img.file.name,
            contentType: img.file.type,
            companyId,
          }),
        })

        if (!presignRes.ok) {
          console.error(`Failed to get presigned URL for ${img.file.name}`)
          continue
        }

        const { uploadUrl, publicUrl } = await presignRes.json()

        // Step 2: Upload file to R2 using presigned URL
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': img.file.type },
          body: img.file,
        })

        if (uploadRes.ok) {
          urls.push(publicUrl)
        } else {
          console.error(`Failed to upload ${img.file.name}`)
        }
      } catch (err) {
        console.error(`Error uploading ${img.file.name}:`, err)
      }
    }

    return urls
  }

  async function handleGenerateDescription() {
    setGenerating(true)
    try {
      const res = await fetch('/api/properties/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo, tipo, propertyType, condition,
          precio, currency,
          bedrooms, bathrooms, garages,
          area, builtArea, privateArea,
          year, ciudad, zona,
        }),
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

    const ownerFilled = ownerNombre.trim() || ownerTelefono1.trim()
    if (ownerFilled) {
      if (!ownerNombre.trim() || !ownerApellido.trim()) {
        setError('El nombre y apellido del propietario son requeridos.')
        return
      }
      if (!ownerTelefono1.trim()) {
        setError('El teléfono del propietario es requerido.')
        return
      }
    }

    setError(null)
    setSaving(true)

    let imageUrls: string[] = []
    if (images.length > 0) {
      setUploading(true)
      imageUrls = await uploadImages()
      setUploading(false)
    }

    let resolvedOwnerContactId = ownerContactId

    if (ownerFilled && !ownerContactId) {
      const cRes = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `${ownerNombre.trim()} ${ownerApellido.trim()}`,
          tipo: 'propietario',
          telefono: ownerTelefono1.trim() || null,
          whatsapp: ownerTelefono2.trim() || null,
          email: ownerEmail.trim() || null,
          fuente: 'manual',
        }),
      })
      if (cRes.ok) {
        const c = await cRes.json()
        resolvedOwnerContactId = c.id
      }
    }

    const forSale = tipo === 'venta'
    const forRent = tipo === 'arriendo'

    const payload = {
      titulo: titulo.trim(),
      tipo,
      for_sale: forSale,
      for_rent: forRent,
      for_transfer: false,
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
      main_image_url: imageUrls[0] ?? null,
      gallery_urls: imageUrls,
      estado_publicacion: 'inactivo',
      disponibilidad: 'disponible',
      fuente: 'manual',
      features_internal: featuresInternal.map(n => ({
        id: n.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        nombre: n,
      })),
      features_external: featuresExternal.map(n => ({
        id: n.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        nombre: n,
      })),
      commission_type: commValue ? commType : null,
      commission_value: commValue ? parseFloat(commValue) : null,
      commission_notes: commNotes.trim() || null,
      ext_commission_type: extCommValue ? extCommType : null,
      ext_commission_value: extCommValue ? parseFloat(extCommValue) : null,
      ext_commission_notes: extCommNotes.trim() || null,
      telefono_propietario: ownerTelefono1.trim() || null,
      owner_contact_id: resolvedOwnerContactId,
      canales_publicados: [],
    }

    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al guardar la propiedad.')
      setSaving(false)
      return
    }

    router.push('/propiedades')
    router.refresh()
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/propiedades"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Propiedades
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">Nueva propiedad</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva propiedad</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Agrega una propiedad manualmente a tu inventario
        </p>
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
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Apartamento moderno en Marbella"
              required
            />
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
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estado del inmueble</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {PROPERTY_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
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
              <Input
                id="precio"
                type="number"
                min="0"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="250000"
                required
              />
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
            <Label htmlFor="maintenance">Cuota de mantenimiento (opcional)</Label>
            <Input
              id="maintenance"
              type="number"
              min="0"
              step="0.01"
              value={maintenanceFee}
              onChange={(e) => setMaintenanceFee(e.target.value)}
              placeholder="150"
            />
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
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle 50, Edificio Pacific..." />
          </div>
        </section>

        {/* Detalles */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Detalles</h2>
          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bedrooms">Habitaciones</Label>
              <Input id="bedrooms" type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bathrooms">Baños</Label>
              <Input id="bathrooms" type="number" min="0" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="garages">Garajes</Label>
              <Input id="garages" type="number" min="0" value={garages} onChange={(e) => setGarages(e.target.value)} placeholder="1" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="area">Área total (m²)</Label>
              <Input id="area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="120" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="built-area">Área construida (m²)</Label>
              <Input id="built-area" value={builtArea} onChange={(e) => setBuiltArea(e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="private-area">Área privada (m²)</Label>
              <Input id="private-area" value={privateArea} onChange={(e) => setPrivateArea(e.target.value)} placeholder="85" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="year">Año de construcción</Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder={String(new Date().getFullYear())}
              />
            </div>
          </div>
        </section>

        {/* Características */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Características</h2>
          <Separator />

          <div className="space-y-4">
            {/* Internas */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-1">Internas</h3>
              <p className="text-xs text-muted-foreground mb-3">Características dentro de la unidad</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {FEATURES_INTERNAL.map((feat) => (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(featuresInternal, setFeaturesInternal, feat)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      featuresInternal.includes(feat)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                        : 'border border-border bg-muted/40 text-muted-foreground hover:border-foreground/50 hover:text-foreground'
                    }`}
                  >
                    {feat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInternalInput}
                  onChange={(e) => setCustomInternalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFeature(customInternalInput, setCustomInternalInput, featuresInternal, setFeaturesInternal))}
                  placeholder="Agregar característica personalizada..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => addCustomFeature(customInternalInput, setCustomInternalInput, featuresInternal, setFeaturesInternal)}
                  className="px-3 py-2 text-xs font-medium rounded-md border border-input bg-muted hover:bg-muted/80"
                >
                  Agregar
                </button>
              </div>
              {featuresInternal.filter(f => !FEATURES_INTERNAL.includes(f)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {featuresInternal.filter(f => !FEATURES_INTERNAL.includes(f)).map((feat) => (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => removeCustomFeature(featuresInternal, setFeaturesInternal, feat)}
                      className="text-xs px-3 py-1.5 rounded-full border border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:border-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-300 transition-colors"
                    >
                      {feat} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Externas */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-1">Externas</h3>
              <p className="text-xs text-muted-foreground mb-3">Amenidades del edificio o conjunto</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {FEATURES_EXTERNAL.map((feat) => (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(featuresExternal, setFeaturesExternal, feat)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      featuresExternal.includes(feat)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                        : 'border border-border bg-muted/40 text-muted-foreground hover:border-foreground/50 hover:text-foreground'
                    }`}
                  >
                    {feat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customExternalInput}
                  onChange={(e) => setCustomExternalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFeature(customExternalInput, setCustomExternalInput, featuresExternal, setFeaturesExternal))}
                  placeholder="Agregar amenidad personalizada..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => addCustomFeature(customExternalInput, setCustomExternalInput, featuresExternal, setFeaturesExternal)}
                  className="px-3 py-2 text-xs font-medium rounded-md border border-input bg-muted hover:bg-muted/80"
                >
                  Agregar
                </button>
              </div>
              {featuresExternal.filter(f => !FEATURES_EXTERNAL.includes(f)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {featuresExternal.filter(f => !FEATURES_EXTERNAL.includes(f)).map((feat) => (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => removeCustomFeature(featuresExternal, setFeaturesExternal, feat)}
                      className="text-xs px-3 py-1.5 rounded-full border border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:border-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-300 transition-colors"
                    >
                      {feat} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Descripción */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Descripción</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleGenerateDescription}
              disabled={generating}
            >
              {generating
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
              {generating ? 'Generando...' : 'Generar con IA'}
            </Button>
          </div>
          <Separator />
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={6}
            placeholder="Describe la propiedad: características, amenidades, estado... o usa el botón para generarla con IA."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          {generating && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Generando descripción en base a los datos ingresados...
            </p>
          )}
        </section>

        {/* Comisiones */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-foreground">Comisiones</h2>
            <Badge variant="secondary" className="text-xs">Opcional</Badge>
          </div>
          <Separator />

          <div className="space-y-5">
            {/* Comisión empresa */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Comisión empresa</p>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <Select value={commType} onValueChange={(v) => setCommType((v ?? 'percentage') as 'percentage' | 'fixed')}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto fijo</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step={commType === 'percentage' ? '0.1' : '1'}
                  value={commValue}
                  onChange={(e) => setCommValue(e.target.value)}
                  placeholder={commType === 'percentage' ? 'Ej: 3' : 'Ej: 5000'}
                  className="h-9"
                />
                <div />
              </div>
              <textarea
                value={commNotes}
                onChange={(e) => setCommNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones (opcional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <Separator />

            {/* Comisión externa */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Comisión externa</p>
              <p className="text-xs text-muted-foreground mb-3">Broker externo, referidos, etc.</p>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <Select value={extCommType} onValueChange={(v) => setExtCommType((v ?? 'percentage') as 'percentage' | 'fixed')}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto fijo</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step={extCommType === 'percentage' ? '0.1' : '1'}
                  value={extCommValue}
                  onChange={(e) => setExtCommValue(e.target.value)}
                  placeholder={extCommType === 'percentage' ? 'Ej: 2' : 'Ej: 3000'}
                  className="h-9"
                />
                <div />
              </div>
              <textarea
                value={extCommNotes}
                onChange={(e) => setExtCommNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones (opcional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
        </section>

        {/* Propietario */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-foreground">Propietario</h2>
            <Badge variant="secondary" className="text-xs">Opcional</Badge>
          </div>
          <Separator />

          {ownerContactId && (
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-green-600 hover:bg-green-700">
                Vinculado
              </Badge>
              <button
                type="button"
                onClick={clearOwnerContact}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 relative">
              <div className="space-y-1.5">
                <Label htmlFor="owner-nombre">Nombre *</Label>
                <Input
                  id="owner-nombre"
                  value={ownerNombre}
                  onChange={(e) => setOwnerNombre(e.target.value)}
                  placeholder="Juan"
                  autoComplete="off"
                />
                {showOwnerDropdown && ownerSuggestions.length > 0 && (
                  <div className="absolute z-50 top-20 left-0 right-2 bg-card border border-border rounded-md shadow-lg overflow-hidden mt-1">
                    {ownerSuggestions.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => selectOwnerContact(contact)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 border-b last:border-b-0 flex items-center gap-2 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {contact.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{contact.nombre}</p>
                          {contact.telefono && (
                            <p className="text-xs text-muted-foreground">{contact.telefono}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showOwnerDropdown && ownerSuggestions.length === 0 && ownerSearching === false && (ownerNombre || ownerApellido) && (
                  <div className="absolute z-50 top-20 left-0 right-2 bg-card border border-border rounded-md shadow-lg px-4 py-3 mt-1 text-xs text-muted-foreground">
                    No se encontraron propietarios
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-apellido">Apellido *</Label>
                <Input
                  id="owner-apellido"
                  value={ownerApellido}
                  onChange={(e) => setOwnerApellido(e.target.value)}
                  placeholder="Pérez"
                  autoComplete="off"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="owner-tel1">Teléfono 1 *</Label>
                <Input
                  id="owner-tel1"
                  value={ownerTelefono1}
                  onChange={(e) => setOwnerTelefono1(e.target.value)}
                  onBlur={() => checkPhoneDuplicate(ownerTelefono1, setPhone1Warn)}
                  placeholder="+507 1234-5678"
                />
                {phone1Warn && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">⚠ Este número ya existe en otro contacto</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-tel2">Teléfono 2</Label>
                <Input
                  id="owner-tel2"
                  value={ownerTelefono2}
                  onChange={(e) => setOwnerTelefono2(e.target.value)}
                  onBlur={() => checkPhoneDuplicate(ownerTelefono2, setPhone2Warn)}
                  placeholder="+507 9876-5432"
                />
                {phone2Warn && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">⚠ Este número ya existe en otro contacto</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="owner-email">Email</Label>
              <Input
                id="owner-email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="juan@example.com"
              />
            </div>
          </div>
        </section>

        {/* Imágenes */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Fotos</h2>
          <Separator />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {images.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <ImagePlus className="h-8 w-8" />
              <div className="text-center">
                <p className="text-sm font-medium">Agregar fotos</p>
                <p className="text-xs">PNG, JPG hasta 10 MB — máximo 20 fotos</p>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={img.preview} alt="" className="h-full w-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white font-medium">
                        Principal
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 20 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Upload className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {images.length} foto{images.length !== 1 ? 's' : ''} · La primera será la imagen principal
              </p>
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href="/propiedades">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-32"
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploading ? 'Subiendo fotos...' : 'Guardando...'}
              </span>
            ) : 'Guardar propiedad'}
          </Button>
        </div>
      </form>
    </div>
  )
}
