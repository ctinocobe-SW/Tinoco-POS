'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Search, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { searchProductos } from '@/lib/queries/productos'
import { getAlmacenes } from '@/lib/queries/almacenes'
import { crearListaAlmacen } from '@/lib/actions/listasAlmacen'

interface ListaItem {
  producto_id: string
  sku: string
  nombre: string
  cantidad: number
  notas: string
}

interface ListaAlmacenDialogProps {
  open: boolean
  onClose: () => void
}

export function ListaAlmacenDialog({ open, onClose }: ListaAlmacenDialogProps) {
  const [nombre, setNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [bodegas, setBodegas] = useState<{ id: string; nombre: string }[]>([])
  const [items, setItems] = useState<ListaItem[]>([])
  const [productoQuery, setProductoQuery] = useState('')
  const [productoResults, setProductoResults] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  // Cargar bodegas al abrir
  useEffect(() => {
    if (open && bodegas.length === 0) {
      getAlmacenes().then((all) => {
        const b = all.filter((a) => a.tipo === 'bodega')
        setBodegas(b)
        if (b.length === 1) setAlmacenId(b[0].id)
      })
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setNombre('')
      setNotas('')
      setAlmacenId('')
      setItems([])
      setProductoQuery('')
    }
  }, [open])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (productoQuery.length >= 2) {
        const results = await searchProductos(productoQuery)
        setProductoResults(results)
        setShowDropdown(true)
      } else {
        setProductoResults([])
        setShowDropdown(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [productoQuery])

  const handleSelectProducto = (p: any) => {
    const ya = items.find((i) => i.producto_id === p.id)
    if (ya) {
      setItems((prev) => prev.map((i) => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setItems((prev) => [...prev, {
        producto_id: p.id,
        sku: p.sku,
        nombre: p.nombre,
        cantidad: 1,
        notas: '',
      }])
    }
    setProductoQuery('')
    setProductoResults([])
    setShowDropdown(false)
  }

  const updateCantidad = (id: string, val: string) => {
    const n = parseFloat(val)
    setItems((prev) => prev.map((i) => i.producto_id === id ? { ...i, cantidad: isNaN(n) ? 0 : n } : i))
  }

  const updateNotas = (id: string, val: string) => {
    setItems((prev) => prev.map((i) => i.producto_id === id ? { ...i, notas: val } : i))
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) { toast.error('El nombre de la lista es requerido'); return }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    if (items.some((i) => i.cantidad <= 0)) { toast.error('Todas las cantidades deben ser mayores a 0'); return }

    setLoading(true)
    const result = await crearListaAlmacen({
      nombre,
      notas: notas || undefined,
      almacen_id: almacenId || undefined,
      items: items.map((i) => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        notas: i.notas || undefined,
      })),
    })
    setLoading(false)

    if (result.error) { toast.error(result.error); return }
    toast.success('Lista de almacén creada')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nueva lista de almacén" className="max-w-2xl w-full">
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="la-nombre">Nombre de la lista *</Label>
            <Input
              id="la-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Pedido semana 15"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="la-bodega">Bodega</Label>
            {bodegas.length === 0 ? (
              <p className="text-xs text-muted-foreground pt-2">Sin bodegas registradas</p>
            ) : (
              <select
                id="la-bodega"
                value={almacenId}
                onChange={(e) => setAlmacenId(e.target.value)}
                className="w-full h-9 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
              >
                <option value="">Sin asignar</option>
                {bodegas.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="la-notas">Notas</Label>
          <Input
            id="la-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones..."
          />
        </div>

        {/* Buscador */}
        <div className="space-y-1.5">
          <Label>Agregar productos</Label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={productoQuery}
              onChange={(e) => setProductoQuery(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full pl-8 pr-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
            {showDropdown && productoResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {productoResults.map((p: any) => (
                  <button key={p.id} type="button" onClick={() => handleSelectProducto(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-brand-surface flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                    <span className="font-medium">{p.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-center w-24">Cantidad</th>
                  <th className="px-3 py-2 text-left">Notas</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.producto_id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium text-xs">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.001" min="0.001"
                        value={item.cantidad}
                        onChange={(e) => updateCantidad(item.producto_id, e.target.value)}
                        className="w-full text-center bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text"
                        value={item.notas}
                        onChange={(e) => updateNotas(item.producto_id, e.target.value)}
                        placeholder="Nota..."
                        className="w-full bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent" />
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeItem(item.producto_id)}
                        className="text-muted-foreground hover:text-red-600 transition-colors">
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

        {items.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            Busca productos arriba para agregarlos a la lista
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={loading || items.length === 0}>
            {loading ? 'Creando...' : 'Crear lista'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
