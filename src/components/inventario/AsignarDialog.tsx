'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { registrarProductoEnAlmacen } from '@/lib/actions/inventario'

interface AsignarDialogProps {
  open: boolean
  onClose: () => void
  item: {
    producto_id: string
    producto_nombre: string
    producto_sku: string
    almacen_id: string       // pre-llenado cuando ya hay filtro activo; vacío si necesita selección
    almacen_nombre: string
  }
  almacenes: { id: string; nombre: string }[]  // opciones cuando almacen_id está vacío
}

export function AsignarDialog({ open, onClose, item, almacenes }: AsignarDialogProps) {
  const [almacenId, setAlmacenId] = useState(item.almacen_id || almacenes[0]?.id || '')
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setAlmacenId(item.almacen_id || almacenes[0]?.id || '')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!almacenId) {
      toast.error('Selecciona un almacén')
      return
    }
    setLoading(true)
    const result = await registrarProductoEnAlmacen(item.producto_id, almacenId)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Producto registrado en el almacén')
    handleClose()
  }

  const necesitaPicker = !item.almacen_id && almacenes.length > 0
  const almacenNombre = necesitaPicker
    ? almacenes.find((a) => a.id === almacenId)?.nombre ?? ''
    : item.almacen_nombre

  return (
    <Dialog open={open} onClose={handleClose} title="Registrar producto en almacén">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-brand-surface rounded-md px-3 py-2.5 text-sm">
          <p className="font-medium">{item.producto_nombre}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.producto_sku}</p>
        </div>

        {necesitaPicker ? (
          <div className="space-y-1.5">
            <Label htmlFor="almacen_sel">Almacén</Label>
            <Select
              id="almacen_sel"
              value={almacenId}
              onChange={(e) => setAlmacenId(e.target.value)}
            >
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Se registrará en <span className="font-medium text-foreground">{almacenNombre}</span> con
            stock inicial 0. Después podrás agregar existencias con "Ajustar".
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar en almacén'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
