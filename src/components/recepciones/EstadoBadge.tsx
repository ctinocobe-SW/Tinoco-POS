import { Badge } from '@/components/ui/badge'
import type { RecepcionEstado } from '@/lib/validations/schemas'

const ESTADO_CONFIG: Record<RecepcionEstado, { label: string; variant: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  borrador:           { label: 'Borrador',          variant: 'default' },
  recibida:           { label: 'Recibida',          variant: 'info' },
  con_discrepancias:  { label: 'Con discrepancias', variant: 'warning' },
  cerrada:            { label: 'Cerrada',           variant: 'success' },
  cancelada:          { label: 'Cancelada',         variant: 'error' },
}

export function EstadoBadge({ estado }: { estado: RecepcionEstado | string }) {
  const config = ESTADO_CONFIG[estado as RecepcionEstado] ?? ESTADO_CONFIG.borrador
  return <Badge variant={config.variant}>{config.label}</Badge>
}
