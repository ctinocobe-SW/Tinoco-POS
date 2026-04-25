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
    activo: boolean
  }
}

export function ProductoCard({ producto }: ProductoCardProps) {
  const base = Number(producto.precio_base)
  const mayoreo = Number(producto.precio_mayoreo)
  const precioDisplay = base > 0
    ? { valor: base, label: 'menudeo' }
    : mayoreo > 0
      ? { valor: mayoreo, label: 'mayoreo' }
      : null

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
        {precioDisplay ? (
          <div className="text-right w-24">
            <p className="text-sm font-medium">{formatMXN(precioDisplay.valor)}</p>
            <p className="text-xs text-muted-foreground">{precioDisplay.label}</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground w-24 text-right">Sin precio</span>
        )}
        <Badge variant={producto.activo ? 'success' : 'warning'}>
          {producto.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>
    </Link>
  )
}
