'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearProveedor, actualizarProveedor } from '@/lib/actions/configuracion'

interface Proveedor {
  id: string
  nombre: string
  razon_social: string | null
  rfc: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
}

interface ProveedorDialogProps {
  open: boolean
  onClose: () => void
  proveedor?: Proveedor | null
}

export function ProveedorDialog({ open, onClose, proveedor }: ProveedorDialogProps) {
  const [nombre, setNombre] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [rfc, setRfc] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (proveedor) {
      setNombre(proveedor.nombre)
      setRazonSocial(proveedor.razon_social ?? '')
      setRfc(proveedor.rfc ?? '')
      setContacto(proveedor.contacto ?? '')
      setTelefono(proveedor.telefono ?? '')
      setEmail(proveedor.email ?? '')
    } else {
      setNombre('')
      setRazonSocial('')
      setRfc('')
      setContacto('')
      setTelefono('')
      setEmail('')
    }
  }, [proveedor, open])

  const handleClose = () => {
    setNombre('')
    setRazonSocial('')
    setRfc('')
    setContacto('')
    setTelefono('')
    setEmail('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const input = {
      nombre,
      razon_social: razonSocial || undefined,
      rfc: rfc || undefined,
      contacto: contacto || undefined,
      telefono: telefono || undefined,
      email: email || '',
    }

    const result = proveedor
      ? await actualizarProveedor(proveedor.id, input)
      : await crearProveedor(input)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(proveedor ? 'Proveedor actualizado' : 'Proveedor creado')
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="p-nombre">Nombre *</Label>
            <Input
              id="p-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Distribuidora XYZ"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-razon">Razón social</Label>
            <Input
              id="p-razon"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="XYZ S.A. de C.V."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-rfc">RFC</Label>
            <Input
              id="p-rfc"
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              placeholder="XYZ000000X00"
              className="font-mono"
              maxLength={13}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-contacto">Contacto</Label>
            <Input
              id="p-contacto"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="Nombre del contacto"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-tel">Teléfono</Label>
            <Input
              id="p-tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="55 1234 5678"
            />
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="p-email">Email</Label>
            <Input
              id="p-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@proveedor.com"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : proveedor ? 'Guardar cambios' : 'Crear proveedor'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
