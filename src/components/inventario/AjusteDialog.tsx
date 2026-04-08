'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ajustarInventario } from '@/lib/actions/inventario'
import type { AjusteInventarioInput } from '@/lib/validations/schemas'

interface AjusteDialogProps {
  open: boolean
  onClose: () => void
  item: {
    inventario_id: string | undefined
    producto_id: string
    almacen_id: string
    producto_nombre: string
    producto_sku: string
    almacen_nombre: string
    stock_actual: number
  }
}

const TIPOS: { value: string; label: string }[] = [
  { value: 'entrada', label: 'Entrada (incrementa stock)' },
  { value: 'salida', label: 'Salida (reduce stock)' },
  { value: 'ajuste', label: 'Ajuste (corrección)' },
  { value: 'merma', label: 'Merma (pérdida/daño)' },
]

export function AjusteDialog({ open, onClose, item }: AjusteDialogProps) {
  const [tipo, setTipo] = useState<string>('ajuste')
  const [cantidad, setCantidad] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setTipo('ajuste')
    setCantidad('')
    setNotas('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(cantidad)
    if (!qty || qty <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    setLoading(true)
    const result = await ajustarInventario({
      inventario_id: item.inventario_id,
      producto_id: item.producto_id,
      almacen_id: item.almacen_id,
      tipo: tipo as AjusteInventarioInput['tipo'],
      cantidad: qty,
      notas: notas || undefined,
    })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Ajuste registrado correctamente')
    handleClose()
  }

  const delta = (() => {
    const qty = parseFloat(cantidad) || 0
    if (tipo === 'salida' || tipo === 'merma') return -qty
    return qty
  })()

  const stockResultante = Math.max(0, item.stock_actual + delta)

  return (
    <Dialog open={open} onClose={handleClose} title="Ajuste de inventario">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-brand-surface rounded-md px-3 py-2.5 text-sm">
          <p className="font-medium">{item.producto_nombre}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.producto_sku} · {item.almacen_nombre}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Stock actual: <span className="font-medium text-foreground">{item.stock_actual}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo de movimiento</Label>
          <Select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cantidad">Cantidad</Label>
          <Input
            id="cantidad"
            type="number"
            step="0.001"
            min="0.001"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="0"
            required
          />
          {cantidad && (
            <p className="text-xs text-muted-foreground">
              Stock resultante: <span className={`font-medium ${stockResultante === 0 ? 'text-red-600' : 'text-foreground'}`}>{stockResultante.toFixed(3).replace(/\.?0+$/, '')}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Input
            id="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Motivo del ajuste..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Confirmar ajuste'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
