'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { crearAlmacen, actualizarAlmacen } from '@/lib/actions/configuracion'
import type { AlmacenTipo } from '@/types/database.types'

interface Almacen {
  id: string
  nombre: string
  ubicacion: string | null
  tipo: AlmacenTipo
}

interface AlmacenDialogProps {
  open: boolean
  onClose: () => void
  almacen?: Almacen | null
}

export function AlmacenDialog({ open, onClose, almacen }: AlmacenDialogProps) {
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [tipo, setTipo] = useState<AlmacenTipo>('bodega')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (almacen) {
      setNombre(almacen.nombre)
      setUbicacion(almacen.ubicacion ?? '')
      setTipo(almacen.tipo)
    } else {
      setNombre('')
      setUbicacion('')
      setTipo('bodega')
    }
  }, [almacen, open])

  const handleClose = () => {
    setNombre('')
    setUbicacion('')
    setTipo('bodega')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const input = { nombre, ubicacion: ubicacion || undefined, tipo }
    const result = almacen
      ? await actualizarAlmacen(almacen.id, input)
      : await crearAlmacen(input)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(almacen ? 'Almacén actualizado' : 'Almacén creado')
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={almacen ? 'Editar almacén' : 'Nuevo almacén'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="a-nombre">Nombre *</Label>
          <Input
            id="a-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Bodega Central"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="a-tipo">Tipo *</Label>
          <Select
            id="a-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as AlmacenTipo)}
          >
            <option value="bodega">Bodega</option>
            <option value="sucursal">Sucursal</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="a-ubicacion">Ubicación</Label>
          <Input
            id="a-ubicacion"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            placeholder="Calle, colonia..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : almacen ? 'Guardar cambios' : 'Crear almacén'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
