'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ContactsTable } from '@/components/crm/ContactsTable'
import { Contact, CrmStage } from '@/lib/types'
import { Plus, Download, Search, KeyRound } from 'lucide-react'
import Link from 'next/link'

export default function PropietariosPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stages, setStages]     = useState<CrmStage[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [isOwner, setIsOwner]   = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setIsOwner(d?.rol === 'owner'))
      .catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [contactsRes, stagesRes] = await Promise.all([
        fetch('/api/crm/contacts?tipo=propietario&limit=500'),
        fetch('/api/crm/stages'),
      ])
      const contactsData = await contactsRes.json()
      const stagesData   = await stagesRes.json()
      setContacts(contactsData.contacts ?? [])
      setStages(stagesData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? contacts.filter((c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.telefono ?? '').toLowerCase().includes(q))
    : contacts

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              Propietarios
            </h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Cargando…'
                : `${contacts.length} propietario${contacts.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isOwner && (
              <a href="/api/crm/contacts/export?tipo=propietario&format=csv">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Exportar CSV
                </Button>
              </a>
            )}
            <Link href="/crm/nuevo?tipo=propietario">
              <Button size="sm" className="h-9 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Nuevo propietario
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono…"
            className="h-9 pl-8 w-72 text-sm"
          />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-muted-foreground">Cargando propietarios…</div>
          </div>
        ) : (
          <ContactsTable contacts={filtered} stages={stages} />
        )}
      </div>
    </div>
  )
}
