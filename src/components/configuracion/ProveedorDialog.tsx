'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { X, Search } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { crearProveedor, actualizarProveedor, setProductosProveedor } from '@/lib/actions/configuracion'

interface Proveedor {
  id: string
  nombre: string
  razon_social: string | null
  rfc: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
}

interface ProductoOption {
  id: string
  sku: string
  nombre: string
}

interface ProveedorDialogProps {
  open: boolean
  onClose: () => void
  proveedor?: Proveedor | null
  productos: ProductoOption[]
}

export function ProveedorDialog({ open, onClose, proveedor, productos }: ProveedorDialogProps) {
  const [nombre, setNombre] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [rfc, setRfc] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Productos asignados
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')

  // Cargar datos del proveedor al editar
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
    setBusqueda('')
  }, [proveedor, open])

  // Cargar productos ya asignados a este proveedor
  useEffect(() => {
    if (!open) return
    if (!proveedor) { setSeleccionados([]); return }
    const supabase = createClient()
    supabase
      .from('producto_proveedor')
      .select('producto_id')
      .eq('proveedor_id', proveedor.id)
      .then(({ data }) => {
        setSeleccionados((data ?? []).map((r: any) => r.producto_id))
      })
  }, [proveedor, open])

  const handleClose = () => {
    setSeleccionados([])
    setBusqueda('')
    onClose()
  }

  const toggle = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return q
      ? productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      : productos
  }, [busqueda, productos])

  const seleccionadosData = useMemo(
    () => productos.filter((p) => seleccionados.includes(p.id)),
    [seleccionados, productos]
  )

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

    let proveedorId = proveedor?.id

    if (proveedor) {
      const result = await actualizarProveedor(proveedor.id, input)
      if (result.error) { toast.error(result.error); setLoading(false); return }
    } else {
      const result = await crearProveedor(input)
      if (result.error) { toast.error(result.error); setLoading(false); return }
      proveedorId = result.data!.id
    }

    // Guardar asignación de productos
    if (proveedorId) {
      const rel = await setProductosProveedor(proveedorId, seleccionados)
      if (rel.error) { toast.error(rel.error); setLoading(false); return }
    }

    setLoading(false)
    toast.success(proveedor ? 'Proveedor actualizado' : 'Proveedor creado')
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos generales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="p-nombre">Nombre *</Label>
            <Input id="p-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Distribuidora XYZ" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-razon">Razón social</Label>
            <Input id="p-razon" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="XYZ S.A. de C.V." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-rfc">RFC</Label>
            <Input id="p-rfc" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} placeholder="XYZ000000X00" className="font-mono" maxLength={13} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-contacto">Contacto</Label>
            <Input id="p-contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Nombre del contacto" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-tel">Teléfono</Label>
            <Input id="p-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="55 1234 5678" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="p-email">Email</Label>
            <Input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@proveedor.com" />
          </div>
        </div>

        {/* Productos que entrega */}
        <div className="border-t border-border pt-4 space-y-3">
          <div>
            <p className="text-sm font-medium">Productos que entrega</p>
            <p className="text-xs text-muted-foreground">Busca y selecciona los productos que surte este proveedor</p>
          </div>

          {/* Chips de seleccionados */}
          {seleccionadosData.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {seleccionadosData.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 text-xs bg-brand-accent/10 text-brand-accent border border-brand-accent/20 rounded-full px-2 py-0.5"
                >
                  {p.nombre}
                  <button type="button" onClick={() => toggle(p.id)} className="hover:text-red-600 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Buscador */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre o SKU..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-accent bg-white"
            />
          </div>

          {/* Lista de resultados */}
          {busqueda && (
            <div className="max-h-40 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {productosFiltrados.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Sin resultados</p>
              ) : productosFiltrados.slice(0, 20).map((p) => {
                const isSelected = seleccionados.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-brand-surface transition-colors ${isSelected ? 'bg-brand-accent/5' : ''}`}
                  >
                    <span>
                      <span className={isSelected ? 'font-medium' : ''}>{p.nombre}</span>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">{p.sku}</span>
                    </span>
                    {isSelected && <span className="text-xs text-brand-accent font-medium">✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
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
