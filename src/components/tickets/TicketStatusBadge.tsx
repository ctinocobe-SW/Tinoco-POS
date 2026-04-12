import { Badge } from '@/components/ui/badge'
import type { TicketEstado } from '@/types/database.types'

type Variant = 'default' | 'warning' | 'success' | 'error' | 'info'

const estadoConfig: Record<TicketEstado, { label: string; variant: Variant }> = {
  borrador: { label: 'Borrador', variant: 'default' },
  pendiente_aprobacion: { label: 'Pendiente', variant: 'warning' },
  aprobado: { label: 'Aprobado', variant: 'success' },
  rechazado: { label: 'Rechazado', variant: 'error' },
  devuelto: { label: 'Devuelto', variant: 'warning' },
  en_verificacion: { label: 'En verificación', variant: 'info' },
  verificado: { label: 'Verificado', variant: 'success' },
  con_incidencias: { label: 'Con incidencias', variant: 'error' },
  despachado: { label: 'Despachado', variant: 'success' },
  facturado: { label: 'Facturado', variant: 'info' },
  cerrado: { label: 'Cerrado', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'error' },
}

// Labels del punto de vista del despachador
const estadoConfigDespachador: Partial<Record<TicketEstado, { label: string; variant: Variant }>> = {
  en_verificacion: { label: 'Terminado · En verificación', variant: 'info' },
  verificado: { label: 'Terminado · Listo para entrega', variant: 'success' },
  con_incidencias: { label: 'Terminado · Con incidencias', variant: 'warning' },
}

interface TicketStatusBadgeProps {
  estado: TicketEstado
  context?: 'despachador'
}

export function TicketStatusBadge({ estado, context }: TicketStatusBadgeProps) {
  const override = context === 'despachador' ? estadoConfigDespachador[estado] : undefined
  const config = override ?? estadoConfig[estado] ?? { label: estado, variant: 'default' as Variant }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
