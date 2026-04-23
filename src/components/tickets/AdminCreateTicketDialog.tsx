'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Search, Trash2, Plus } from 'lucide-react'

import { crearTicketSchema } from '@/lib/validations/schemas'
import type { CrearTicketInput } from '@/lib/validations/schemas'
import { crearTicket, obtenerDespachadorSugerido } from '@/lib/actions/tickets'
import { searchClientes } from '@/lib/queries/clientes'
import { searchProductos } from '@/lib/queries/productos'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { formatMXN } from '@/lib/utils/format'

interface Perfil { id: string; nombre: string; rol: string }
interface Almacen { id: string; nombre: string }

interface AdminCreateTicketDialogProps {
  open: boolean
  onClose: () => void
  despachadores: Perfil[]
  almacenes: Almacen[]
}

interface ItemMeta {
  sku: string
  nombre: string
  precio_base: number
}

const ALMACEN_DEFAULT_NOMBRE = 'El Mercader'

function pickAlmacenDefault(almacenes: Almacen[]): string {
  const target = almacenes.find((a) => a.nombre.trim().toLowerCase() === ALMACEN_DEFAULT_NOMBRE.toLowerCase())
  return target?.id ?? almacenes[0]?.id ?? ''
}

export function AdminCreateTicketDialog({ open, onClose, despachadores, almacenes }: AdminCreateTicketDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [asignacionMode, setAsignacionMode] = useState<'manual' | 'auto'>('manual')
  const [autoSugerido, setAutoSugerido] = useState<{ id: string; nombre: string } | null>(null)
  const [loadingAuto, setLoadingAuto] = useState(false)

  // Cliente search
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteResults, setClienteResults] = useState<{ id: string; nombre: string; rfc: string | null }[]>([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{ id: string; nombre: string } | null>(null)

  // Producto search
  const [productoQuery, setProductoQuery] = useState('')
  const [productoResults, setProductoResults] = useState<any[]>([])
  const [showProductoDropdown, setShowProductoDropdown] = useState(false)
  const [itemsMeta, setItemsMeta] = useState<Map<string, ItemMeta>>(new Map())

  const form = useForm<CrearTicketInput>({
    resolver: zodResolver(crearTicketSchema),
    defaultValues: {
      cliente_id: '',
      despachador_id: '',
      almacen_id: pickAlmacenDefault(almacenes),
      notas: '',
      items: [],
    },
  })

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  useEffect(() => {
    if (!open) {
      reset({
        cliente_id: '',
        despachador_id: '',
        almacen_id: pickAlmacenDefault(almacenes),
        notas: '',
        items: [],
      })
      setClienteQuery('')
      setClienteSeleccionado(null)
      setProductoQuery('')
      setItemsMeta(new Map())
      setAsignacionMode('manual')
      setAutoSugerido(null)
    }
  }, [open, reset, almacenes])

  // Buscar clientes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (clienteQuery.length >= 2) {
        const results = await searchClientes(clienteQuery)
        setClienteResults(results)
        setShowClienteDropdown(true)
      } else {
        setClienteResults([])
        setShowClienteDropdown(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [clienteQuery])

  // Buscar productos
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (productoQuery.length >= 2) {
        const results = await searchProductos(productoQuery)
        setProductoResults(results)
        setShowProductoDropdown(true)
      } else {
        setProductoResults([])
        setShowProductoDropdown(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [productoQuery])

  // Obtener sugerencia automática cuando el modo cambia a 'auto'
  useEffect(() => {
    if (!open || asignacionMode !== 'auto') return
    let cancelled = false
    setLoadingAuto(true)
    setAutoSugerido(null)
    ;(async () => {
      const result = await obtenerDespachadorSugerido()
      if (cancelled) return
      if (result.error || !result.data) {
        toast.error(result.error ?? 'No hay despachadores disponibles')
        setAsignacionMode('manual')
      } else {
        setAutoSugerido(result.data)
        setValue('despachador_id', result.data.id)
      }
      setLoadingAuto(false)
    })()
    return () => { cancelled = true }
  }, [asignacionMode, open, setValue])

  const handleSelectCliente = (c: { id: string; nombre: string; rfc: string | null }) => {
    setClienteSeleccionado(c)
    setValue('cliente_id', c.id)
    setClienteQuery(c.nombre)
    setShowClienteDropdown(false)
  }

  const handleSelectProducto = (p: any) => {
    setItemsMeta((prev) => new Map(prev).set(p.id, {
      sku: p.sku,
      nombre: p.nombre,
      precio_base: Number(p.precio_base),
    }))
    append({
      producto_id: p.id,
      cantidad: 1,
      precio_unitario: Number(p.precio_base),
      descuento: 0,
    })
    setProductoQuery('')
    setProductoResults([])
    setShowProductoDropdown(false)
  }

  // Calcular total — precio directo sin IVA
  const total = watchedItems.reduce((acc, item) => {
    const precio = Number(item.precio_unitario) || 0
    const cantidad = Number(item.cantidad) || 0
    const descuento = Number(item.descuento) || 0
    return acc + (precio * cantidad - descuento)
  }, 0)

  const onSubmit = async (data: CrearTicketInput) => {
    if (!data.despachador_id) {
      toast.error('Debes asignar un despachador (manual o automático)')
      return
    }
    setSubmitting(true)
    try {
      const result = await crearTicket(data)
      if (result.error) { toast.error(result.error); return }
      toast.success(`Ticket ${result.data?.folio} creado`)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Crear ticket" className="max-w-4xl w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Fila 1: Cliente + Despachador + Almacén */}
        <div className="grid grid-cols-3 gap-4">
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={clienteQuery}
                onChange={(e) => {
                  setClienteQuery(e.target.value)
                  if (!e.target.value) { setClienteSeleccionado(null); setValue('cliente_id', '') }
                }}
                placeholder="Buscar cliente..."
                className="w-full pl-8 pr-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
              {showClienteDropdown && clienteResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {clienteResults.map((c) => (
                    <button key={c.id} type="button" onClick={() => handleSelectCliente(c)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-surface">
                      <span className="font-medium">{c.nombre}</span>
                      {c.rfc && <span className="text-muted-foreground ml-2 text-xs font-mono">{c.rfc}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.cliente_id && <p className="text-xs text-red-600">{errors.cliente_id.message}</p>}
          </div>

          {/* Despachador */}
          <div className="space-y-1.5">
            <Label>Despachador *</Label>
            <div className="flex gap-4 text-sm mb-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="asignacion_mode"
                  checked={asignacionMode === 'manual'}
                  onChange={() => { setAsignacionMode('manual'); setValue('despachador_id', '') }}
                  className="accent-brand-accent"
                />
                Manual
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="asignacion_mode"
                  checked={asignacionMode === 'auto'}
                  onChange={() => setAsignacionMode('auto')}
                  className="accent-brand-accent"
                />
                Automático
              </label>
            </div>
            {asignacionMode === 'manual' ? (
              <Select id="despachador_id" {...register('despachador_id')}>
                <option value="">Selecciona un despachador...</option>
                {despachadores.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </Select>
            ) : (
              <div className="px-3 py-2 border border-border rounded-md bg-brand-surface/40 text-sm min-h-[38px] flex items-center">
                {loadingAuto ? (
                  <span className="text-muted-foreground">Calculando despachador con menor carga...</span>
                ) : autoSugerido ? (
                  <span>Asignado a <span className="font-medium">{autoSugerido.nombre}</span></span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            )}
          </div>

          {/* Almacén */}
          <div className="space-y-1.5">
            <Label htmlFor="almacen_id">Almacén *</Label>
            <Select id="almacen_id" {...register('almacen_id')}>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Buscador de producto */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-brand-surface/40">
            <span className="text-sm font-medium">Productos</span>
            {errors.items && <p className="text-xs text-red-600">{errors.items.message ?? errors.items.root?.message}</p>}
          </div>
          <div className="px-4 py-3 border-b border-border">
            <div className="relative max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={productoQuery}
                onChange={(e) => setProductoQuery(e.target.value)}
                placeholder="Buscar producto por nombre o SKU..."
                className="w-full pl-8 pr-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
              {showProductoDropdown && productoResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {productoResults.map((p: any) => (
                    <button key={p.id} type="button" onClick={() => handleSelectProducto(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-surface flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                      <span className="font-medium">{p.nombre}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{formatMXN(Number(p.precio_base))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {fields.length > 0 ? (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">Producto</th>
                  <th className="px-4 py-2 text-center w-20">Cant.</th>
                  <th className="px-4 py-2 text-center w-32">Precio unit.</th>
                  <th className="px-4 py-2 text-center w-28">Descuento</th>
                  <th className="px-4 py-2 text-right w-28">Subtotal</th>
                  <th className="px-4 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const meta = itemsMeta.get(watchedItems[index]?.producto_id ?? '')
                  const precio = Number(watchedItems[index]?.precio_unitario) || 0
                  const cantidad = Number(watchedItems[index]?.cantidad) || 0
                  const descuento = Number(watchedItems[index]?.descuento) || 0
                  const subtotal = precio * cantidad - descuento
                  return (
                    <tr key={field.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        {meta ? (
                          <div>
                            <p className="font-medium text-xs">{meta.nombre}</p>
                            <p className="text-xs text-muted-foreground font-mono">{meta.sku}</p>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" step="0.001" min="0.001"
                          {...register(`items.${index}.cantidad`, { valueAsNumber: true })}
                          className="w-full text-center bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" min="0"
                          {...register(`items.${index}.precio_unitario`, { valueAsNumber: true })}
                          className="w-full text-center bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" min="0"
                          {...register(`items.${index}.descuento`, { valueAsNumber: true })}
                          placeholder="0"
                          className="w-full text-center bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent" />
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{formatMXN(subtotal)}</td>
                      <td className="px-4 py-2">
                        <button type="button" onClick={() => remove(index)}
                          className="text-muted-foreground hover:text-red-600 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Busca y agrega productos arriba
            </div>
          )}
        </div>

        {/* Total */}
        {fields.length > 0 && (
          <div className="flex justify-end">
            <div className="w-56 text-sm">
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span>Total</span><span>{formatMXN(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas</Label>
          <Input id="notas" {...register('notas')} placeholder="Observaciones del ticket..." />
        </div>

        {/* Acciones */}
        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={submitting || fields.length === 0 || !clienteSeleccionado}>
            {submitting ? 'Creando...' : 'Crear ticket'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
