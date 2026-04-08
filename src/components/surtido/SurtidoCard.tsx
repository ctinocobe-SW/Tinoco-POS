'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { formatMXN, formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { despacharTicket } from '@/lib/actions/tickets'
import type { TicketEstado } from '@/types/database.types'

interface SurtidoCardProps {
  ticket: {
    id: string
    folio: string
    estado: TicketEstado
    total: number
    created_at: string
    verificado_at: string | null
    despachado_at: string | null
    cliente_nombre: string | null
    almacen_nombre: string | null
    total_items: number
  }
}

const ESTADO_LABELS: Partial<Record<TicketEstado, string>> = {
  verificado: 'Verificado',
  con_incidencias: 'Con incidencias',
  despachado: 'Despachado',
}

const ESTADO_VARIANTS: Partial<Record<TicketEstado, 'success' | 'warning' | 'error' | 'default'>> = {
  verificado: 'success',
  con_incidencias: 'warning',
  despachado: 'default',
}

export function SurtidoCard({ ticket }: SurtidoCardProps) {
  const [estado, setEstado] = useState<TicketEstado>(ticket.estado)
  const [isPending, startTransition] = useTransition()

  const handleDespachar = () => {
    startTransition(async () => {
      const result = await despacharTicket(ticket.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setEstado('despachado')
      toast.success(`Ticket ${ticket.folio} despachado`)
    })
  }

  const listoPara = estado === 'verificado' || estado === 'con_incidencias'

  return (
    <div className={`border rounded-lg px-4 py-3 flex items-center justify-between gap-4 ${
      listoPara ? 'border-border' : 'border-border bg-brand-surface/40'
    }`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-medium text-sm">{ticket.folio}</span>
          <Badge variant={ESTADO_VARIANTS[estado] ?? 'default'}>
            {ESTADO_LABELS[estado] ?? estado}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {ticket.cliente_nombre ?? 'Sin cliente'}
          {ticket.almacen_nombre ? ` · ${ticket.almacen_nombre}` : ''}
          {' · '}{ticket.total_items} producto{ticket.total_items !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          <span className="font-medium text-foreground">{formatMXN(Number(ticket.total))}</span>
          {ticket.verificado_at && ` · Verificado ${formatDate(ticket.verificado_at)}`}
          {ticket.despachado_at && ` · Despachado ${formatDate(ticket.despachado_at)}`}
        </p>
      </div>

      <div className="shrink-0">
        {listoPara && (
          <Button size="sm" onClick={handleDespachar} disabled={isPending}>
            {isPending ? 'Despachando...' : 'Marcar despachado'}
          </Button>
        )}
      </div>
    </div>
  )
}
