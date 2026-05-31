'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Contact } from '@/lib/types'
import { Building2, Plus, Search, X, Loader2, ExternalLink } from 'lucide-react'

interface LinkedProperty {
  id: string
  contact_id: string
  property_id: string
  interes: string
  created_at: string
  properties?: {
    id: string
    titulo: string
    precio: number
    ciudad: string | null
    bedrooms: number | null
    main_image_url: string | null
  }
}

interface Props {
  contact: Contact
  linked: LinkedProperty[]
  onReload: () => void
}

interface PropertySearchResult {
  id: string
  titulo: string
  precio: number
  ciudad: string | null
  bedrooms: number | null
  main_image_url: string | null
}

const INTERES_LABEL: Record<string, string> = {
  interesado: 'Interesado',
  propietario: 'Propietario',
  'visitó':    'Visitó',
  'ofertó':    'Ofertó',
  descartado:  'Descartado',
}

export function ContactPropertiesTab({ contact, linked, onReload }: Props) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PropertySearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  // Debounced fetch
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/properties?search=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const rows = await res.json()
        setResults((rows as PropertySearchResult[]).map((r) => ({
          id: r.id, titulo: r.titulo, precio: Number(r.precio),
          ciudad: r.ciudad, bedrooms: r.bedrooms, main_image_url: r.main_image_url,
        })))
      }
    } finally { setSearching(false) }
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => doSearch(search), 250)
    return () => clearTimeout(handle)
  }, [search, doSearch])

  async function linkProperty(propertyId: string, interes = 'interesado') {
    setLinking(propertyId)
    try {
      const res = await fetch(`/api/crm/contacts/${contact.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, interes }),
      })
      if (res.ok) {
        setShowSearch(false); setSearch(''); setResults([])
        onReload()
      }
    } finally { setLinking(null) }
  }

  async function unlinkProperty(linkId: string) {
    if (!confirm('¿Eliminar este vínculo?')) return
    const res = await fetch(`/api/crm/contacts/${contact.id}/links/${linkId}`, { method: 'DELETE' })
    if (res.ok) onReload()
  }

  async function updateInteres(linkId: string, interes: string) {
    await fetch(`/api/crm/contacts/${contact.id}/links/${linkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interes }),
    })
    onReload()
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Propiedades vinculadas</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {linked.length === 0 ? 'Ninguna propiedad vinculada' : `${linked.length} propiedad${linked.length === 1 ? '' : 'es'} vinculada${linked.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowSearch((s) => !s)}>
            {showSearch ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {showSearch ? 'Cancelar' : 'Vincular propiedad'}
          </Button>
        </header>

        {showSearch && (
          <div className="border-b border-border px-5 py-4 bg-muted/20">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título o zona…"
                className="h-9 pl-8 text-sm"
                autoFocus
              />
            </div>
            <div className="mt-3 max-h-80 overflow-y-auto">
              {searching ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Buscando…</div>
              ) : results.length === 0 && search ? (
                <p className="text-xs text-muted-foreground">Sin resultados.</p>
              ) : (
                <ul className="space-y-1.5">
                  {results.map((r) => {
                    const alreadyLinked = linked.some((l) => l.property_id === r.id)
                    return (
                      <li key={r.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-card border border-transparent hover:border-border">
                        <div className="h-10 w-14 rounded bg-muted overflow-hidden shrink-0 relative">
                          {r.main_image_url ? (
                            <Image src={r.main_image_url} alt="" fill sizes="56px" className="object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.titulo}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {r.ciudad ? `${r.ciudad} · ` : ''}{r.bedrooms ? `${r.bedrooms} hab · ` : ''}USD {r.precio.toLocaleString('en-US')}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyLinked ? 'outline' : 'default'}
                          className="h-7 text-xs"
                          disabled={alreadyLinked || linking === r.id}
                          onClick={() => linkProperty(r.id)}
                        >
                          {linking === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : alreadyLinked ? 'Vinculada' : 'Vincular'}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="p-5">
          {linked.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay propiedades vinculadas todavía.</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">Usa &ldquo;Vincular propiedad&rdquo; arriba para conectar este contacto a tu inventario.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {linked.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="h-12 w-16 rounded bg-muted overflow-hidden shrink-0 relative">
                    {l.properties?.main_image_url ? (
                      <Image src={l.properties.main_image_url} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/propiedades?focus=${l.property_id}`} className="text-sm font-medium hover:text-primary inline-flex items-center gap-1">
                      {l.properties?.titulo ?? 'Propiedad'}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      {l.properties?.ciudad && `${l.properties.ciudad} · `}
                      {l.properties?.bedrooms && `${l.properties.bedrooms} hab · `}
                      {l.properties?.precio && `USD ${Number(l.properties.precio).toLocaleString('en-US')}`}
                    </p>
                  </div>
                  <Select value={l.interes} onValueChange={(v) => updateInteres(l.id, v ?? 'interesado')}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(INTERES_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600" onClick={() => unlinkProperty(l.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
