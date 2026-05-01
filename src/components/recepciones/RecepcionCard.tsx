import Link from 'next/link'
import { EstadoBadge } from './EstadoBadge'
import { formatDate, formatMXN } from '@/lib/utils/format'
import type { RecepcionEstado } from '@/lib/validations/schemas'

export interface RecepcionResumen {
  id: string
  fecha: string
  estado: RecepcionEstado | string
  proveedor_nombre: string | null
  almacen_nombre: string | null
  total_items: number
  folio_factura: string | null
  monto_factura: number | null
  href: string
}

export function RecepcionCard({ recepcion }: { recepcion: RecepcionResumen }) {
  return (
    <Link
      href={recepcion.href}
      className="flex items-center justify-between border border-border rounded-lg px-4 py-3 hover:border-brand-accent/40 transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium">{formatDate(recepcion.fecha)}</p>
          <EstadoBadge estado={recepcion.estado} />
          {recepcion.folio_factura && (
            <span className="text-xs font-mono text-muted-foreground">F: {recepcion.folio_factura}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {recepcion.proveedor_nombre ?? 'Sin proveedor'}
          {recepcion.almacen_nombre ? ` · ${recepcion.almacen_nombre}` : ''}
          {' · '}{recepcion.total_items} producto{recepcion.total_items !== 1 ? 's' : ''}
        </p>
      </div>
      {recepcion.monto_factura != null && (
        <p className="text-sm font-medium shrink-0 ml-4">{formatMXN(Number(recepcion.monto_factura))}</p>
      )}
    </Link>
  )
}
