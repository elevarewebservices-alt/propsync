import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { XmlImportWizard } from '@/components/propiedades/XmlImportWizard'

export const metadata = { title: 'Importar propiedades — PropSync' }

export default function ImportarPropiedadesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Link href="/propiedades">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Regresar
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-semibold truncate">Importar propiedades</h1>
          <p className="text-sm text-muted-foreground">Sube un archivo XML con tu inventario</p>
        </div>
      </div>
      <XmlImportWizard />
    </div>
  )
}
