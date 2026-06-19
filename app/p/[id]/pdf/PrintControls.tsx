'use client'

import { Printer } from 'lucide-react'

// Floating button (hidden when printing) that triggers the browser's
// print-to-PDF dialog. Uses native print so photos render at full quality.
export function PrintControls() {
  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex gap-2">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
      >
        <Printer className="h-4 w-4" />
        Descargar PDF
      </button>
    </div>
  )
}
