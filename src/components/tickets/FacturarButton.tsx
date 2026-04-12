'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Receipt } from 'lucide-react'
import { timbrarTicket } from '@/lib/actions/facturas'

interface Props {
  ticketId: string
  facturado: boolean
  cfdiUuid: string | null
}

export function FacturarButton({ ticketId, facturado, cfdiUuid }: Props) {
  const [isPending, startTransition] = useTransition()

  if (facturado && cfdiUuid) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <Receipt size={14} />
        <span className="font-medium">Facturado</span>
        <span className="text-xs font-mono text-green-600 ml-1">{cfdiUuid.slice(0, 8).toUpperCase()}…</span>
      </div>
    )
  }

  const handleFacturar = () => {
    startTransition(async () => {
      const result = await timbrarTicket(ticketId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Proceso de facturación iniciado')
    })
  }

  return (
    <button
      type="button"
      onClick={handleFacturar}
      disabled={isPending || facturado}
      className="flex items-center gap-2 text-sm border border-border rounded-lg px-4 py-2 hover:bg-brand-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Receipt size={14} />
      {isPending ? 'Procesando...' : 'Facturar'}
    </button>
  )
}
