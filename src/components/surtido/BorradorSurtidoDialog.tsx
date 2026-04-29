'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Sparkles, Trash2, AlertTriangle } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { getAlmacenes } from '@/lib/queries/almacenes'
import {
  generarBorradorSurtido,
  crearListaSurtido,
  type BorradorCandidato,
} from '@/lib/actions/listasSurtido'
import { getPreferenciasSurtido } from '@/lib/actions/preferenciasSurtido'
import { blurOnWheel } from '@/lib/utils/input-handlers'

interface Props {
  open: boolean
  onClose: () => void
}

interface ItemBorrador extends BorradorCandidato {
  cantidad: number
  almacen_origen_item_id: string | ''
}

export function BorradorSurtidoDialog({ open, onClose }: Props) {
  const [almacenes, setAlmacenes] = useState<{ id: string; nombre: string; tipo: string }[]>([])
  const [destinoId, setDestinoId] = useState('')
  const [topN, setTopN] = useState(20)
  const [incluirBajoMin, setIncluirBajoMin] = useState(true)
  const [items, setItems] = useState<ItemBorrador[]>([])
  const [loadingGen, setLoadingGen] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([getAlmacenes(), getPreferenciasSurtido()]).then(([all, pref]) => {
      setAlmacenes(all)
      const prefData = (pref as any).data
      const sucursales = all.filter((a) => a.tipo === 'sucursal')
      const def = prefData?.almacen_destino_default || sucursales[0]?.id || ''
      setDestinoId(def)
      if (prefData?.top_n) setTopN(prefData.top_n)
      if (typeof prefData?.incluir_bajo_minimo === 'boolean') setIncluirBajoMin(prefData.incluir_bajo_minimo)
    })
  }, [open])

  useEffect(() => {
    if (!open) {
      setItems([])
      setGenerated(false)
    }
  }, [open])

  const bodegas = almacenes.filter((a) => a.tipo === 'bodega')
  const sucursales = almacenes.filter((a) => a.tipo === 'sucursal')

  const handleGenerar = async () => {
    if (!destinoId) { toast.error('Selecciona un almacén destino'); return }
    setLoadingGen(true)
    const res = await generarBorradorSurtido({
      almacen_destino_id: destinoId,
      top_n: topN,
      incluir_bajo_minimo: incluirBajoMin,
    })
    setLoadingGen(false)
    if (res.error) { toast.error(res.error); return }
    const cands = res.data ?? []
    setItems(cands.map((c) => ({
      ...c,
      cantidad: c.cantidad_sugerida,
      almacen_origen_item_id: '',
    })))
    setGenerated(true)
    if (cands.length === 0) toast.message('No hay productos candidatos para surtir')
  }

  const updateItem = (productoId: string, patch: Partial<ItemBorrador>) => {
    setItems((prev) => prev.map((i) => i.producto_id === productoId ? { ...i, ...patch } : i))
  }

  const removeItem = (productoId: string) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== productoId))
  }

  const handleGuardar = async () => {
    if (items.length === 0) { toast.error('No hay items en el borrador'); return }
    if (items.some((i) => i.cantidad <= 0)) { toast.error('Todas las cantidades deben ser mayores a 0'); return }

    setLoadingSave(true)
    const res = await crearListaSurtido({
      almacen_destino_id: destinoId,
      items: items.map((i) => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        almacen_origen_item_id: i.almacen_origen_item_id || undefined,
      })),
    })
    setLoadingSave(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('Borrador de surtido creado')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Generar borrador de surtido" className="max-w-4xl w-full">
      <div className="space-y-4">

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="destino">Almacén destino *</Label>
            <Select id="destino" value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
              <option value="">— Selecciona —</option>
              {sucursales.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topn">Top N productos</Label>
            <input
              id="topn"
              type="number"
              min={1}
              max={200}
              value={topN}
              onWheel={blurOnWheel}
              onChange={(e) => setTopN(parseInt(e.target.value) || 20)}
              className="w-full h-9 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={incluirBajoMin}
                onChange={(e) => setIncluirBajoMin(e.target.checked)}
                className="w-4 h-4 accent-brand-accent"
              />
              Incluir bajo mínimo
            </label>
          </div>
        </div>

        <Button type="button" onClick={handleGenerar} disabled={loadingGen || !destinoId} variant="outline">
          <Sparkles size={14} className="mr-1.5" />
          {loadingGen ? 'Generando...' : generated ? 'Regenerar borrador' : 'Generar borrador'}
        </Button>

        {generated && items.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No hay productos candidatos. Asegúrate de que los productos tengan
            <span className="font-medium text-foreground"> control de inventario</span> activo y stock mínimo configurado.
          </div>
        )}

        {items.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-brand-surface">
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right w-20">Stock</th>
                    <th className="px-3 py-2 text-right w-20">Mín</th>
                    <th className="px-3 py-2 text-right w-20">Máx</th>
                    <th className="px-3 py-2 text-center w-24">Cantidad</th>
                    <th className="px-3 py-2 text-left w-44">Bodega origen</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.producto_id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {it.bajo_minimo && (
                            <AlertTriangle size={13} className="text-amber-600" />
                          )}
                          <div>
                            <p className="font-medium text-xs">{it.nombre}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {it.sku} · {it.unidad}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.stock_destino}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.stock_minimo}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.stock_maximo ?? '—'}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          onWheel={blurOnWheel}
                          value={it.cantidad}
                          onChange={(e) =>
                            updateItem(it.producto_id, { cantidad: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full text-center bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={it.almacen_origen_item_id}
                          onChange={(e) =>
                            updateItem(it.producto_id, { almacen_origen_item_id: e.target.value })
                          }
                          className="w-full h-8 px-2 border border-border rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        >
                          <option value="">— Elegir bodega —</option>
                          {bodegas.map((b) => (
                            <option key={b.id} value={b.id}>{b.nombre}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(it.producto_id)}
                          className="text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            onClick={handleGuardar}
            disabled={loadingSave || items.length === 0}
          >
            {loadingSave ? 'Guardando...' : 'Crear lista de surtido'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={loadingSave}>
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
