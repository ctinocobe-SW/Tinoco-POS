'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'
import { obtenerUrlFactura } from '@/lib/actions/recepciones'

export function FacturaLink({ path, label = 'Ver factura' }: { path: string; label?: string }) {
  const [pending, startTransition] = useTransition()
  const [opening, setOpening] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setOpening(true)
    startTransition(async () => {
      const result = await obtenerUrlFactura(path)
      setOpening(false)
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      window.open((result as any).data.url, '_blank', 'noopener')
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || opening}
      className="inline-flex items-center gap-1 text-sm text-brand-accent hover:underline disabled:opacity-60"
    >
      <FileText size={13} />
      {opening || pending ? 'Abriendo...' : label}
    </button>
  )
}
