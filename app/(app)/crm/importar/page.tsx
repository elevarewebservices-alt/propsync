import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ImportWizard } from '@/components/crm/ImportWizard'

export default function ImportarPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/crm">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Regresar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Importar contactos</h1>
          <p className="text-sm text-muted-foreground">Sube un archivo Excel o CSV con tus contactos</p>
        </div>
      </div>
      <ImportWizard />
    </div>
  )
}
