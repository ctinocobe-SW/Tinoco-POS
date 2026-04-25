'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { AjusteDialog } from './AjusteDialog'
import { ToggleControlaInventarioButton } from './ToggleControlaInventarioButton'

interface StockEntry {
  inventario_id: string
  almacen_id: string
  almacen_nombre: string
  stock_actual: number
  stock_minimo: number
}

interface ProductoRow {
  producto_id: string
  producto_sku: string
  producto_nombre: string
  producto_categoria: string
  controla_inventario: boolean
  stock_total: number
  stock_entries: StockEntry[]
}

interface AjusteTarget {
  inventario_id: string | undefined
  producto_id: string
  producto_nombre: string
  producto_sku: string
  almacen_id: string
  almacen_nombre: string
  stock_actual: number
}

interface InventarioTableProps {
  rows: ProductoRow[]
  almacenes: { id: string; nombre: string }[]
}

export function InventarioTable({ rows, almacenes }: InventarioTableProps) {
  const [filtroAlmacen, setFiltroAlmacen] = useState<string>('todos')
  const [soloControlados, setSoloControlados] = useState(false)
  const [ajusteTarget, setAjusteTarget] = useState<AjusteTarget | null>(null)
  const [ajusteAlmacenes, setAjusteAlmacenes] = useState<{ id: string; nombre: string }[]>([])
  const [controlOverrides, setControlOverrides] = useState<Map<string, boolean>>(new Map())

  // Construir vista según filtro
  const tableRows = useMemo(() => {
    return rows.map((p) => {
      const controla = controlOverrides.get(p.producto_id) ?? p.controla_inventario
      if (filtroAlmacen === 'todos') {
        // Mostrar stock total
        return {
          producto_id: p.producto_id,
          producto_sku: p.producto_sku,
          producto_nombre: p.producto_nombre,
          producto_categoria: p.producto_categoria,
          controla_inventario: controla,
          stock: p.stock_total,
          stock_minimo: Math.min(...p.stock_entries.map((e) => e.stock_minimo), Infinity) === Infinity ? 0 : Math.min(...p.stock_entries.map((e) => e.stock_minimo)),
          almacen_nombre: p.stock_entries.length > 1
            ? `${p.stock_entries.length} almacenes`
            : p.stock_entries[0]?.almacen_nombre ?? '—',
          tiene_stock: p.stock_total > 0,
          // Para ajuste: si hay una sola entrada de almacén, usarla; si hay varias o ninguna, abrir picker
          ajuste_entry: p.stock_entries.length === 1 ? p.stock_entries[0] : null,
        }
      } else {
        const entry = p.stock_entries.find((e) => e.almacen_id === filtroAlmacen)
        const almacen = almacenes.find((a) => a.id === filtroAlmacen)
        return {
          producto_id: p.producto_id,
          producto_sku: p.producto_sku,
          producto_nombre: p.producto_nombre,
          producto_categoria: p.producto_categoria,
          controla_inventario: controla,
          stock: entry?.stock_actual ?? 0,
          stock_minimo: entry?.stock_minimo ?? 0,
          almacen_nombre: almacen?.nombre ?? '',
          tiene_stock: (entry?.stock_actual ?? 0) > 0,
          ajuste_entry: entry ?? null,
        }
      }
    })
  }, [rows, filtroAlmacen, almacenes, controlOverrides])

  const visibleRows = soloControlados ? tableRows.filter((r) => r.controla_inventario) : tableRows

  const bajosMinimo = visibleRows.filter((r) => r.controla_inventario && r.stock_minimo > 0 && r.stock < r.stock_minimo).length
  const sinStock = visibleRows.filter((r) => r.controla_inventario && !r.tiene_stock).length

  const handleAjustar = (row: typeof tableRows[0]) => {
    if (filtroAlmacen !== 'todos' || row.ajuste_entry) {
      // Ajuste directo
      const entry = row.ajuste_entry
      const almacen = almacenes.find((a) => a.id === filtroAlmacen) ?? (entry ? { id: entry.almacen_id, nombre: entry.almacen_nombre } : null)
      setAjusteAlmacenes([])
      setAjusteTarget({
        inventario_id: entry?.inventario_id,
        producto_id: row.producto_id,
        producto_nombre: row.producto_nombre,
        producto_sku: row.producto_sku,
        almacen_id: entry?.almacen_id ?? filtroAlmacen,
        almacen_nombre: entry?.almacen_nombre ?? almacen?.nombre ?? '',
        stock_actual: entry?.stock_actual ?? 0,
      })
    } else {
      // Necesita seleccionar almacén primero → pasar lista al dialog
      setAjusteAlmacenes(almacenes)
      setAjusteTarget({
        inventario_id: undefined,
        producto_id: row.producto_id,
        producto_nombre: row.producto_nombre,
        producto_sku: row.producto_sku,
        almacen_id: '',
        almacen_nombre: '',
        stock_actual: row.stock,
      })
    }
  }

  return (
    <>
      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Almacén:</label>
          <Select value={filtroAlmacen} onChange={(e) => setFiltroAlmacen(e.target.value)} className="w-48">
            <option value="todos">Todos</option>
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={soloControlados}
            onChange={(e) => setSoloControlados(e.target.checked)}
            className="w-4 h-4 accent-brand-accent"
          />
          Solo con control activo
        </label>
        {bajosMinimo > 0 && (
          <span className="flex items-center gap-1 text-amber-600 text-sm">
            <AlertTriangle size={13} />
            {bajosMinimo} bajo mínimo
          </span>
        )}
        {sinStock > 0 && (
          <span className="text-muted-foreground text-sm">{sinStock} sin stock</span>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left">Producto</th>
              <th className="px-4 py-2.5 text-left w-28">Categoría</th>
              {filtroAlmacen === 'todos' && <th className="px-4 py-2.5 text-left">Almacén(es)</th>}
              <th className="px-4 py-2.5 text-center w-24">Control</th>
              <th className="px-4 py-2.5 text-right w-28">Stock</th>
              <th className="px-4 py-2.5 text-center w-24">Estado</th>
              <th className="px-4 py-2.5 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const controla = row.controla_inventario
              const bajo = controla && row.stock_minimo > 0 && row.stock < row.stock_minimo
              return (
                <tr key={row.producto_id} className={`border-b border-border last:border-0 hover:bg-brand-surface/50 ${!controla ? 'opacity-60' : !row.tiene_stock ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.producto_nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">{row.producto_sku}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.producto_categoria}</td>
                  {filtroAlmacen === 'todos' && (
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.almacen_nombre}</td>
                  )}
                  <td className="px-4 py-3 text-center">
                    <ToggleControlaInventarioButton
                      productoId={row.producto_id}
                      controla={controla}
                      onChange={(nuevo) => {
                        setControlOverrides((prev) => {
                          const next = new Map(prev)
                          next.set(row.producto_id, nuevo)
                          return next
                        })
                      }}
                    />
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium tabular-nums ${bajo ? 'text-red-600' : !row.tiene_stock ? 'text-muted-foreground' : ''}`}>
                    {row.tiene_stock
                      ? (row.stock % 1 === 0 ? row.stock : row.stock.toFixed(3).replace(/0+$/, ''))
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!controla ? (
                      <span className="inline-flex text-xs text-muted-foreground bg-brand-surface border border-border rounded-full px-2 py-0.5">
                        Sin control
                      </span>
                    ) : !row.tiene_stock ? (
                      <span className="inline-flex text-xs text-muted-foreground bg-brand-surface border border-border rounded-full px-2 py-0.5">
                        Sin stock
                      </span>
                    ) : bajo ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                        <AlertTriangle size={10} />Bajo
                      </span>
                    ) : (
                      <span className="inline-flex text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => handleAjustar(row)}>
                      Ajustar
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {ajusteTarget && (
        <AjusteDialog
          open={!!ajusteTarget}
          onClose={() => { setAjusteTarget(null); setAjusteAlmacenes([]) }}
          item={ajusteTarget}
          almacenesDisponibles={ajusteAlmacenes}
        />
      )}
    </>
  )
}
