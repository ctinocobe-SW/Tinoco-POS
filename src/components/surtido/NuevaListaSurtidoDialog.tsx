'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Search } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { getAlmacenes } from '@/lib/queries/almacenes'
import { searchProductos } from '@/lib/queries/productos'
import { crearListaSurtido } from '@/lib/actions/listasSurtido'
import { blurOnWheel } from '@/lib/utils/input-handlers'

interface Props {
  open: boolean
  onClose: () => void
}

interface ItemBorrador {
  producto_id: string
  nombre: string
  sku: string
  unidad: string
  cantidad: number
  almacen_origen_item_id: string
}

export function NuevaListaSurtidoDialog({ open, onClose }: Props) {
  const [almacenes, setAlmacenes] = useState<{ id: string; nombre: string; tipo: string }[]>([])
  const [destinoId, setDestinoId] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemBorrador[]>([])
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Awaited<ReturnType<typeof searchProductos>>>([])
  const [buscando, setBuscando] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    getAlmacenes().then((all) => {
      setAlmacenes(all)
      const suc = all.filter((a) => a.tipo === 'sucursal')
      if (suc.length > 0) setDestinoId(suc[0].id)
    })
  }, [open])

  useEffect(() => {
    if (!open) {
      setItems([])
      setQuery('')
      setResultados([])
      setNotas('')
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResultados([]); return }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      const res = await searchProductos(query)
      setResultados(res)
      setBuscando(false)
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const bodegas = almacenes.filter((a) => a.tipo === 'bodega')
  const sucursales = almacenes.filter((a) => a.tipo === 'sucursal')

  const agregarProducto = (p: Awaited<ReturnType<typeof searchProductos>>[number]) => {
    if (items.some((i) => i.producto_id === p.id)) {
      toast.message(`${p.nombre} ya está en la lista`)
      return
    }
    const unidad = p.vende_caja ? 'caja' : p.vende_kg ? 'kg' : p.vende_bulto ? 'bulto' : 'pza'
    setItems((prev) => [...prev, {
      producto_id: p.id,
      nombre: p.nombre,
      sku: p.sku,
      unidad,
      cantidad: 1,
      almacen_origen_item_id: bodegas[0]?.id ?? '',
    }])
    setQuery('')
    setResultados([])
    searchRef.current?.focus()
  }

  const updateItem = (productoId: string, patch: Partial<ItemBorrador>) => {
    setItems((prev) => prev.map((i) => i.producto_id === productoId ? { ...i, ...patch } : i))
  }

  const removeItem = (productoId: string) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== productoId))
  }

  const handleGuardar = async () => {
    if (!destinoId) { toast.error('Selecciona un almacén destino'); return }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    if (items.some((i) => i.cantidad <= 0)) { toast.error('Todas las cantidades deben ser mayores a 0'); return }

    setSaving(true)
    const res = await crearListaSurtido({
      almacen_destino_id: destinoId,
      notas: notas || undefined,
      items: items.map((i) => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        almacen_origen_item_id: i.almacen_origen_item_id || undefined,
      })),
    })
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('Lista de surtido creada')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nueva lista de surtido" className="max-w-3xl w-full">
      <div className="space-y-4">

        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="notas">Notas (opcional)</Label>
            <input
              id="notas"
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones..."
              className="w-full h-9 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>
        </div>

        {/* Buscador de productos */}
        <div className="space-y-1.5">
          <Label>Agregar producto</Label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full h-9 pl-8 pr-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>
          {(resultados.length > 0 || buscando) && (
            <div className="border border-border rounded-md bg-white shadow-sm max-h-48 overflow-y-auto">
              {buscando && (
                <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p>
              )}
              {resultados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => agregarProducto(p)}
                  className="w-full px-3 py-2 text-left hover:bg-brand-surface text-sm flex items-center gap-2 border-b border-border last:border-0"
                >
                  <Plus size={13} className="text-muted-foreground shrink-0" />
                  <span className="font-medium">{p.nombre}</span>
                  <span className="text-muted-foreground font-mono text-xs">{p.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabla de items */}
        {items.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-brand-surface">
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-center w-24">Cantidad</th>
                    <th className="px-3 py-2 text-left w-44">Bodega origen</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.producto_id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <p className="font-medium text-xs">{it.nombre}</p>
                        <p className="text-xs text-muted-foreground font-mono">{it.sku} · {it.unidad}</p>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={it.cantidad}
                          onWheel={blurOnWheel}
                          onChange={(e) => updateItem(it.producto_id, { cantidad: parseFloat(e.target.value) || 0 })}
                          className="w-full text-center bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={it.almacen_origen_item_id}
                          onChange={(e) => updateItem(it.producto_id, { almacen_origen_item_id: e.target.value })}
                          className="w-full h-8 px-2 border border-border rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        >
                          <option value="">— Sin bodega —</option>
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
          <Button type="button" onClick={handleGuardar} disabled={saving || items.length === 0}>
            {saving ? 'Guardando...' : 'Crear lista'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
