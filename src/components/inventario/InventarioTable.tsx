'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { AjusteDialog } from './AjusteDialog'

interface InventarioRow {
  inventario_id: string
  producto_id: string
  producto_sku: string
  producto_nombre: string
  producto_unidad: string
  almacen_id: string
  almacen_nombre: string
  stock_actual: number
  stock_minimo: number
}

interface InventarioTableProps {
  rows: InventarioRow[]
  almacenes: { id: string; nombre: string }[]
}

export function InventarioTable({ rows, almacenes }: InventarioTableProps) {
  const [filtroAlmacen, setFiltroAlmacen] = useState<string>('todos')
  const [ajusteItem, setAjusteItem] = useState<InventarioRow | null>(null)

  const filtered = useMemo(() => {
    if (filtroAlmacen === 'todos') return rows
    return rows.filter((r) => r.almacen_id === filtroAlmacen)
  }, [rows, filtroAlmacen])

  const bajosMinimo = filtered.filter((r) => r.stock_actual < r.stock_minimo).length

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Almacén:</label>
          <Select
            value={filtroAlmacen}
            onChange={(e) => setFiltroAlmacen(e.target.value)}
            className="w-48"
          >
            <option value="todos">Todos</option>
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </Select>
        </div>
        {bajosMinimo > 0 && (
          <div className="flex items-center gap-1.5 text-amber-600 text-sm">
            <AlertTriangle size={14} />
            {bajosMinimo} producto{bajosMinimo !== 1 ? 's' : ''} bajo mínimo
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-border rounded-lg">
          No hay registros de inventario para este almacén
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Producto</th>
                <th className="px-4 py-2.5 text-left">Almacén</th>
                <th className="px-4 py-2.5 text-right w-28">Stock actual</th>
                <th className="px-4 py-2.5 text-right w-28">Stock mínimo</th>
                <th className="px-4 py-2.5 text-center w-24">Estado</th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const bajo = row.stock_actual < row.stock_minimo
                return (
                  <tr key={row.inventario_id} className="border-b border-border last:border-0 hover:bg-brand-surface/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.producto_nombre}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {row.producto_sku} · {row.producto_unidad}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {row.almacen_nombre}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium tabular-nums ${bajo ? 'text-red-600' : ''}`}>
                      {row.stock_actual % 1 === 0 ? row.stock_actual : row.stock_actual.toFixed(3).replace(/0+$/, '')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground tabular-nums">
                      {row.stock_minimo % 1 === 0 ? row.stock_minimo : row.stock_minimo.toFixed(3).replace(/0+$/, '')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {bajo ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          <AlertTriangle size={10} />
                          Bajo
                        </span>
                      ) : (
                        <span className="inline-flex text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAjusteItem(row)}
                      >
                        Ajustar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {ajusteItem && (
        <AjusteDialog
          open={!!ajusteItem}
          onClose={() => setAjusteItem(null)}
          item={{
            inventario_id: ajusteItem.inventario_id,
            producto_id: ajusteItem.producto_id,
            almacen_id: ajusteItem.almacen_id,
            producto_nombre: ajusteItem.producto_nombre,
            producto_sku: ajusteItem.producto_sku,
            almacen_nombre: ajusteItem.almacen_nombre,
            stock_actual: ajusteItem.stock_actual,
          }}
        />
      )}
    </>
  )
}
