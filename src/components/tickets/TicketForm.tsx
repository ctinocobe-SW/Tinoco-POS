'use client'

import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2 } from 'lucide-react'

import { crearTicketSchema, type CrearTicketInput } from '@/lib/validations/schemas'
import { searchClientes } from '@/lib/queries/clientes'
import { searchProductos } from '@/lib/queries/productos'
import { crearTicket } from '@/lib/actions/tickets'
import { formatMXN } from '@/lib/utils/format'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ClienteResult = { id: string; nombre: string; rfc: string | null }
type ProductoResult = {
  id: string; sku: string; nombre: string; precio_base: number
  tasa_iva: number; tasa_ieps: number; peso_kg: number
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

  // Producto metadata (para mostrar nombre/sku en la tabla)
  const [productosMeta, setProductosMeta] = useState<Map<string, ProductoResult>>(new Map())

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
    setProductoResults(results)
    setShowProductoDropdown(results.length > 0)
  }, [])

  const addProducto = (producto: ProductoResult) => {
    // Evitar duplicados
    const existing = form.getValues('items')
    if (existing.some((i) => i.producto_id === producto.id)) {
      toast.error('Producto ya agregado')
      return
    }

    setProductosMeta((prev) => new Map(prev).set(producto.id, producto))
    append({
      producto_id: producto.id,
      cantidad: 1,
      precio_unitario: Number(producto.precio_base),
      descuento: 0,
    })
    setProductoQuery('')
    setShowProductoDropdown(false)
  }

  // Calcular totales
  const watchItems = form.watch('items')
  let subtotal = 0
  let iva = 0
  let ieps = 0

  watchItems.forEach((item) => {
    const lineSub = (item.precio_unitario ?? 0) * (item.cantidad ?? 0) - (item.descuento ?? 0)
    const meta = productosMeta.get(item.producto_id)
    subtotal += lineSub
    if (meta) {
      iva += lineSub * meta.tasa_iva
      ieps += lineSub * meta.tasa_ieps
    }
  })
  const total = subtotal + iva + ieps

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
              {productoResults.map((p) => (
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
                    <span>{formatMXN(Number(p.precio_base))}</span>
                    <Plus size={14} className="text-brand-accent" />
                  </div>
                </button>
              ))}
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
                <th className="text-right px-3 py-2 font-medium w-24">Cant.</th>
                <th className="text-right px-3 py-2 font-medium w-32">Precio</th>
                <th className="text-right px-3 py-2 font-medium w-28">Desc.</th>
                <th className="text-right px-3 py-2 font-medium w-32">Subtotal</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const meta = productosMeta.get(field.producto_id)
                const qty = form.watch(`items.${index}.cantidad`) ?? 0
                const price = form.watch(`items.${index}.precio_unitario`) ?? 0
                const disc = form.watch(`items.${index}.descuento`) ?? 0
                const lineSub = price * qty - disc

                return (
                  <tr key={field.id} className="border-t border-border/50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{meta?.nombre ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{meta?.sku}</div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        {...form.register(`items.${index}.cantidad`, { valueAsNumber: true })}
                        className="w-full text-right bg-transparent border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        {...form.register(`items.${index}.precio_unitario`, { valueAsNumber: true })}
                        className="w-full text-right bg-transparent border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
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

      {/* Totales */}
      {fields.length > 0 && (
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMXN(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span>{formatMXN(iva)}</span>
            </div>
            {ieps > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IEPS</span>
                <span>{formatMXN(ieps)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-border pt-1">
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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creando...' : 'Crear ticket'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
