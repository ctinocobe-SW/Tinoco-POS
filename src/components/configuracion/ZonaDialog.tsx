'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { crearZona, actualizarZona } from '@/lib/actions/configuracion'

interface Zona {
  id: string
  nombre: string
  almacen_id: string
  despachador_id: string | null
}

interface Almacen { id: string; nombre: string }
interface Despachador { id: string; nombre: string }

interface ZonaDialogProps {
  open: boolean
  onClose: () => void
  zona?: Zona | null
  almacenes: Almacen[]
  despachadores: Despachador[]
}

export function ZonaDialog({ open, onClose, zona, almacenes, despachadores }: ZonaDialogProps) {
  const [nombre, setNombre] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [despachadorId, setDespachadorId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (zona) {
      setNombre(zona.nombre)
      setAlmacenId(zona.almacen_id)
      setDespachadorId(zona.despachador_id ?? '')
    } else {
      setNombre('')
      setAlmacenId(almacenes[0]?.id ?? '')
      setDespachadorId('')
    }
  }, [zona, open, almacenes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !almacenId) return
    setLoading(true)

    const input = { nombre: nombre.trim(), almacen_id: almacenId, despachador_id: despachadorId || undefined }
    const result = zona ? await actualizarZona(zona.id, input) : await crearZona(input)

    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(zona ? 'Zona actualizada' : 'Zona creada')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={zona ? 'Editar zona' : 'Nueva zona'} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="z-nombre">Nombre *</Label>
          <Input id="z-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Pasillo 1, Refrigerados" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="z-almacen">Almacén / Sucursal *</Label>
          <Select id="z-almacen" value={almacenId} onChange={(e) => setAlmacenId(e.target.value)} required>
            <option value="">Seleccionar...</option>
            {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="z-desp">Despachador responsable</Label>
          <Select id="z-desp" value={despachadorId} onChange={(e) => setDespachadorId(e.target.value)}>
            <option value="">Sin asignar</option>
            {despachadores.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </Select>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : zona ? 'Guardar' : 'Crear zona'}</Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
        </div>
      </form>
    </Dialog>
  )
}
