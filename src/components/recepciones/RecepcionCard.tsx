'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { confirmarRecepcion } from '@/lib/actions/recepciones'
import { formatDate } from '@/lib/utils/format'

interface RecepcionCardProps {
  recepcion: {
    id: string
    fecha: string
    confirmado: boolean
    confirmado_at: string | null
    proveedor_nombre: string | null
    total_items: number
  }
}

export function RecepcionCard({ recepcion }: RecepcionCardProps) {
  const [confirmado, setConfirmado] = useState(recepcion.confirmado)
  const [isPending, startTransition] = useTransition()

  const handleConfirmar = (e: React.MouseEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await confirmarRecepcion(recepcion.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setConfirmado(true)
      toast.success('Recepción confirmada — inventario actualizado')
    })
  }

  return (
    <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium">{formatDate(recepcion.fecha)}</p>
          <Badge variant={confirmado ? 'success' : 'warning'}>
            {confirmado ? 'Confirmada' : 'Pendiente'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {recepcion.proveedor_nombre ?? 'Sin proveedor'} · {recepcion.total_items} producto{recepcion.total_items !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="shrink-0 ml-4">
        {!confirmado && (
          <Button
            size="sm"
            onClick={handleConfirmar}
            disabled={isPending}
          >
            {isPending ? 'Confirmando...' : 'Confirmar recepción'}
          </Button>
        )}
        {confirmado && recepcion.confirmado_at && (
          <p className="text-xs text-muted-foreground">
            Confirmada el {formatDate(recepcion.confirmado_at)}
          </p>
        )}
      </div>
    </div>
  )
}
