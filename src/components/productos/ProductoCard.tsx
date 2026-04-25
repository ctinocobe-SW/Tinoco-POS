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
    precio_mayoreo: number
    unidad_precio_base: string | null
    unidad_precio_mayoreo: string | null
    activo: boolean
  }
}

export function ProductoCard({ producto }: ProductoCardProps) {
  const base = Number(producto.precio_base)
  const mayoreo = Number(producto.precio_mayoreo)

  return (
    <Link
      href={`/admin/productos/${producto.id}`}
      className="grid grid-cols-[90px_minmax(220px,1fr)_140px_140px_100px] items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-brand-surface/50 transition-colors"
    >
      <span className="text-xs font-mono text-muted-foreground truncate">{producto.sku}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{producto.nombre}</p>
        {producto.categoria && (
          <p className="text-xs text-muted-foreground truncate">{producto.categoria}</p>
        )}
      </div>
      {base > 0 ? (
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums">{formatMXN(base)}</p>
          {producto.unidad_precio_base && (
            <p className="text-xs text-muted-foreground">{producto.unidad_precio_base}</p>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground text-right">—</span>
      )}
      {mayoreo > 0 ? (
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums">{formatMXN(mayoreo)}</p>
          {producto.unidad_precio_mayoreo && (
            <p className="text-xs text-muted-foreground">{producto.unidad_precio_mayoreo}</p>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground text-right">—</span>
      )}
      <div className="flex justify-center">
        <Badge variant={producto.activo ? 'success' : 'warning'}>
          {producto.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>
    </Link>
  )
}
