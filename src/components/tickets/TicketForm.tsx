'use client'

import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2 } from 'lucide-react'

import { crearTicketSchema, type CrearTicketInput, type UnidadVenta } from '@/lib/validations/schemas'
import { searchClientes } from '@/lib/queries/clientes'
import { searchProductos } from '@/lib/queries/productos'
import { crearTicket } from '@/lib/actions/tickets'
import { formatMXN } from '@/lib/utils/format'
import { blurOnWheel } from '@/lib/utils/input-handlers'
import { construirOpciones, type UnidadOpcion } from '@/lib/utils/precio-producto'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ClienteResult = { id: string; nombre: string; rfc: string | null }
type ProductoResult = {
  id: string
  sku: string
  nombre: string
  precio_base: number
  precio_mayoreo: number
  unidad_precio_base: UnidadVenta | null
  unidad_precio_mayoreo: UnidadVenta | null
  peso_kg: number
  piezas_por_caja: number | null
  piezas_por_bulto: number | null
  vende_caja: boolean
  vende_bulto: boolean
}

interface ItemMeta {
  sku: string
  nombre: string
  opciones: UnidadOpcion[]
}

export function TicketForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // Cliente search
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteResults, setClienteResults] = useState<ClienteResult[]>([])
  const [selectedCliente, setSelectedCliente] = useState<ClienteResult | null>(null)
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)

  // Producto search
  const [productoQuery, setProductoQuery] = useState('')
  const [productoResults, setProductoResults] = useState<ProductoResult[]>([])
  const [showProductoDropdown, setShowProductoDropdown] = useState(false)

  // Producto metadata (nombre/sku/opciones por producto_id)
  const [productosMeta, setProductosMeta] = useState<Map<string, ItemMeta>>(new Map())

  const form = useForm<CrearTicketInput>({
    resolver: zodResolver(crearTicketSchema),
    defaultValues: {
      cliente_id: '',
      items: [],
      notas: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  // Debounced search for clientes
  const handleClienteSearch = useCallback(async (query: string) => {
    setClienteQuery(query)
    if (query.length < 2) {
      setClienteResults([])
      setShowClienteDropdown(false)
      return
    }
    const results = await searchClientes(query)
    setClienteResults(results)
    setShowClienteDropdown(results.length > 0)
  }, [])

  const selectCliente = (cliente: ClienteResult) => {
    setSelectedCliente(cliente)
    setClienteQuery(cliente.nombre)
    setShowClienteDropdown(false)
    form.setValue('cliente_id', cliente.id)
  }

  // Debounced search for productos
  const handleProductoSearch = useCallback(async (query: string) => {
    setProductoQuery(query)
    if (query.length < 2) {
      setProductoResults([])
      setShowProductoDropdown(false)
      return
    }
    const results = await searchProductos(query)
    setProductoResults(results as ProductoResult[])
    setShowProductoDropdown(results.length > 0)
  }, [])

  const addProducto = (producto: ProductoResult) => {
    const existing = form.getValues('items')
    if (existing.some((i) => i.producto_id === producto.id)) {
      toast.error('Producto ya agregado')
      return
    }

    const opciones = construirOpciones(producto)
    if (opciones.length === 0) {
      toast.error('El producto no tiene precios o unidades configuradas')
      return
    }

    const primera = opciones[0]
    setProductosMeta((prev) => new Map(prev).set(producto.id, {
      sku: producto.sku,
      nombre: producto.nombre,
      opciones,
    }))
    append({
      producto_id: producto.id,
      cantidad: primera.cantidad_default ?? 1,
      precio_unitario: primera.precio,
      descuento: 0,
      unidad: primera.unidad,
    })
    setProductoQuery('')
    setShowProductoDropdown(false)
  }

  // Calcular total
  const watchItems = form.watch('items')
  let total = 0
  watchItems.forEach((item) => {
    total += (item.precio_unitario ?? 0) * (item.cantidad ?? 0) - (item.descuento ?? 0)
  })

  const onSubmit = async (data: CrearTicketInput) => {
    setSubmitting(true)
    const result = await crearTicket(data)
    setSubmitting(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(`Ticket ${result.data!.folio} creado`)
    router.push('/despachador/tickets')
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {/* Cliente */}
      <div className="space-y-1.5">
        <Label>Cliente</Label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nombre o RFC..."
            value={clienteQuery}
            onChange={(e) => handleClienteSearch(e.target.value)}
            onFocus={() => clienteResults.length > 0 && setShowClienteDropdown(true)}
            className="pl-9"
          />
          {showClienteDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {clienteResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-brand-surface transition-colors"
                  onClick={() => selectCliente(c)}
                >
                  <span className="font-medium">{c.nombre}</span>
                  {c.rfc && <span className="text-muted-foreground ml-2">{c.rfc}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedCliente && (
          <p className="text-xs text-muted-foreground">
            Seleccionado: {selectedCliente.nombre} {selectedCliente.rfc && `(${selectedCliente.rfc})`}
          </p>
        )}
        {form.formState.errors.cliente_id && (
          <p className="text-xs text-red-600">{form.formState.errors.cliente_id.message}</p>
        )}
      </div>

      {/* Agregar productos */}
      <div className="space-y-1.5">
        <Label>Agregar productos</Label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar producto por nombre o SKU..."
            value={productoQuery}
            onChange={(e) => handleProductoSearch(e.target.value)}
            onFocus={() => productoResults.length > 0 && setShowProductoDropdown(true)}
            className="pl-9"
          />
          {showProductoDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {productoResults.map((p) => {
                const opciones = construirOpciones(p)
                const precioPreview = opciones[0]?.precio ?? 0
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-brand-surface transition-colors flex items-center justify-between"
                    onClick={() => addProducto(p)}
                  >
                    <div>
                      <span className="font-medium">{p.nombre}</span>
                      <span className="text-muted-foreground ml-2">{p.sku}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatMXN(precioPreview)}</span>
                      <Plus size={14} className="text-brand-accent" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      {fields.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-surface text-muted-foreground">
                  <th className="text-left px-3 py-2 font-medium">Producto</th>
                  <th className="text-left px-3 py-2 font-medium w-36">Unidad</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Cant.</th>
                  <th className="text-right px-3 py-2 font-medium w-32">Precio unit.</th>
                  <th className="text-right px-3 py-2 font-medium w-28">Desc.</th>
                  <th className="text-right px-3 py-2 font-medium w-32">Subtotal</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const meta = productosMeta.get(field.producto_id)
                  const opciones = meta?.opciones ?? []
                  const unidadActual = watchItems[index]?.unidad
                  const precio = watchItems[index]?.precio_unitario ?? 0
                  const qty = watchItems[index]?.cantidad ?? 0
                  const disc = watchItems[index]?.descuento ?? 0
                  const lineSub = precio * qty - disc

                  return (
                    <tr key={field.id} className="border-t border-border/50">
                      <td className="px-3 py-2">
                        <div className="font-medium">{meta?.nombre ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{meta?.sku}</div>
                      </td>
                      <td className="px-3 py-2">
                        {opciones.length > 1 ? (
                          <select
                            value={opciones.find((o) => o.unidad === unidadActual && o.precio === precio)?.key ?? opciones[0]?.key ?? ''}
                            onChange={(e) => {
                              const seleccionada = opciones.find((o) => o.key === e.target.value)
                              if (!seleccionada) return
                              form.setValue(`items.${index}.unidad`, seleccionada.unidad)
                              form.setValue(`items.${index}.precio_unitario`, seleccionada.precio)
                              if (seleccionada.cantidad_default !== undefined) {
                                form.setValue(`items.${index}.cantidad`, seleccionada.cantidad_default)
                              }
                            }}
                            className="w-full bg-white border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent"
                          >
                            {opciones.map((o) => (
                              <option key={o.key} value={o.key}>
                                {o.label} — {formatMXN(o.precio)}
                              </option>
                            ))}
                          </select>
                        ) : opciones.length === 1 ? (
                          <span className="text-xs text-muted-foreground">{opciones[0].label}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0.1}
                          step="0.1"
                          onWheel={blurOnWheel}
                          value={qty || ''}
                          {...form.register(`items.${index}.cantidad`, { valueAsNumber: true })}
                          className="w-full text-right bg-transparent border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        />
                      </td>
                      {/* Precio: solo lectura para el despachador */}
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {formatMXN(precio)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          onWheel={blurOnWheel}
                          {...form.register(`items.${index}.descuento`, { valueAsNumber: true })}
                          className="w-full text-right bg-transparent border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatMXN(lineSub)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form.formState.errors.items && (
        <p className="text-xs text-red-600">{form.formState.errors.items.message}</p>
      )}

      {/* Total */}
      {fields.length > 0 && (
        <div className="flex justify-end">
          <div className="w-48 text-sm">
            <div className="flex justify-between font-semibold border-t border-border pt-2">
              <span>Total</span>
              <span>{formatMXN(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notas */}
      <div className="space-y-1.5">
        <Label>Notas (opcional)</Label>
        <textarea
          {...form.register('notas')}
          rows={3}
          className="w-full bg-white border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors placeholder:text-muted-foreground resize-none"
          placeholder="Instrucciones especiales..."
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting || fields.length === 0 || !selectedCliente}>
          {submitting ? 'Creando...' : 'Crear ticket'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
