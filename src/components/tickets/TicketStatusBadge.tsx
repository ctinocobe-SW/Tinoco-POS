import { Badge } from '@/components/ui/badge'
import type { TicketEstado } from '@/types/database.types'

const estadoConfig: Record<TicketEstado, { label: string; variant: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
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
}

interface TicketStatusBadgeProps {
  estado: TicketEstado
}

export function TicketStatusBadge({ estado }: TicketStatusBadgeProps) {
  const config = estadoConfig[estado] ?? { label: estado, variant: 'default' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
