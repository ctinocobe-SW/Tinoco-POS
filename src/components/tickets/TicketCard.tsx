import Link from 'next/link'
import { TicketStatusBadge } from './TicketStatusBadge'
import { formatMXN, formatDate } from '@/lib/utils/format'
import type { TicketEstado } from '@/types/database.types'

interface TicketCardProps {
  ticket: {
    id: string
    folio: string
    estado: TicketEstado
    total: number
    created_at: string
    cliente_nombre?: string
  }
  href?: string
}

export function TicketCard({ ticket, href }: TicketCardProps) {
  const content = (
    <div className="border border-border rounded-lg p-4 hover:bg-brand-surface transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{ticket.folio}</span>
        <TicketStatusBadge estado={ticket.estado} />
      </div>
      {ticket.cliente_nombre && (
        <p className="text-sm text-muted-foreground mb-1">{ticket.cliente_nombre}</p>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{formatMXN(Number(ticket.total))}</span>
        <span className="text-muted-foreground text-xs">{formatDate(ticket.created_at)}</span>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
