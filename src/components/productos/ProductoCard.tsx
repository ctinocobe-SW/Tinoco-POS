'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatMXN } from '@/lib/utils/format'

interface ProductoCardProps {
  producto: {
    id: string
    sku: string
    nombre: string
    categoria: string | null
    unidad_medida: string
    precio_base: number
    activo: boolean
  }
}

export function ProductoCard({ producto }: ProductoCardProps) {
  return (
    <Link
      href={`/admin/productos/${producto.id}`}
      className="flex items-center justify-between border border-border rounded-lg px-4 py-3 hover:bg-brand-surface transition-colors"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-16 shrink-0">
          <span className="text-xs font-mono text-muted-foreground">{producto.sku}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{producto.nombre}</p>
          {producto.categoria && (
            <p className="text-xs text-muted-foreground">{producto.categoria}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        <span className="text-xs text-muted-foreground">{producto.unidad_medida}</span>
        <span className="text-sm font-medium w-24 text-right">{formatMXN(Number(producto.precio_base))}</span>
        <Badge variant={producto.activo ? 'success' : 'warning'}>
          {producto.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>
    </Link>
  )
}
