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
        {base > 0 ? (
          <div className="text-right w-28">
            <p className="text-sm font-medium">{formatMXN(base)}</p>
            <p className="text-xs text-muted-foreground">
              menudeo{producto.unidad_precio_base ? ` · ${producto.unidad_precio_base}` : ''}
            </p>
          </div>
        ) : (
          <div className="w-28" />
        )}
        {mayoreo > 0 ? (
          <div className="text-right w-28">
            <p className="text-sm font-medium">{formatMXN(mayoreo)}</p>
            <p className="text-xs text-muted-foreground">
              mayoreo{producto.unidad_precio_mayoreo ? ` · ${producto.unidad_precio_mayoreo}` : ''}
            </p>
          </div>
        ) : (
          <div className="w-28" />
        )}
        {base === 0 && mayoreo === 0 && (
          <span className="text-sm text-muted-foreground">Sin precio</span>
        )}
        <Badge variant={producto.activo ? 'success' : 'warning'}>
          {producto.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>
    </Link>
  )
}
