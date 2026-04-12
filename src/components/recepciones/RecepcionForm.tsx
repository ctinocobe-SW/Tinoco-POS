'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Trash2, Search } from 'lucide-react'

import { crearRecepcionSchema } from '@/lib/validations/schemas'
import type { CrearRecepcionInput } from '@/lib/validations/schemas'
import { crearRecepcion } from '@/lib/actions/recepciones'
import { searchProveedores } from '@/lib/queries/proveedores'
import { searchProductos } from '@/lib/queries/productos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface Almacen {
  id: string
  nombre: string
  tipo: string
}

interface RecepcionFormProps {
  almacenes: Almacen[]
}

interface ProveedorResult {
  id: string
  nombre: string
  rfc: string | null
}

interface ProductoResult {
  id: string
  sku: string
  nombre: string
  requiere_caducidad: boolean
}

export function RecepcionForm({ almacenes }: RecepcionFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // Proveedor search
  const [proveedorQuery, setProveedorQuery] = useState('')
  const [proveedoresResults, setProveedoresResults] = useState<ProveedorResult[]>([])
  const [showProveedorDropdown, setShowProveedorDropdown] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<ProveedorResult | null>(null)

  // Producto search
  const [productoQuery, setProductoQuery] = useState('')
  const [productosResults, setProductosResults] = useState<any[]>([])
  const [showProductoDropdown, setShowProductoDropdown] = useState(false)
  const [productosMeta, setProductosMeta] = useState<Map<string, ProductoResult>>(new Map())

  const form = useForm<CrearRecepcionInput>({
    resolver: zodResolver(crearRecepcionSchema),
    defaultValues: {
      proveedor_id: undefined,
      almacen_id: almacenes[0]?.id ?? '',
      fecha: new Date().toISOString().split('T')[0],
      notas: '',
      items: [],
    },
  })

  const { register, handleSubmit, control, setValue, formState: { errors }, watch } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // Buscar proveedores
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (proveedorQuery.length >= 2) {
        const results = await searchProveedores(proveedorQuery)
        setProveedoresResults(results)
        setShowProveedorDropdown(true)
      } else {
        setProveedoresResults([])
        setShowProveedorDropdown(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [proveedorQuery])

  // Buscar productos
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (productoQuery.length >= 2) {
        const results = await searchProductos(productoQuery)
        setProductosResults(results)
        setShowProductoDropdown(true)
      } else {
        setProductosResults([])
        setShowProductoDropdown(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [productoQuery])

  const handleSelectProveedor = (p: ProveedorResult) => {
    setProveedorSeleccionado(p)
    setValue('proveedor_id', p.id)
    setProveedorQuery(p.nombre)
    setShowProveedorDropdown(false)
  }

  const handleSelectProducto = (p: any) => {
    setProductosMeta((prev) => new Map(prev).set(p.id, {
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      requiere_caducidad: p.requiere_caducidad ?? false,
    }))
    append({
      producto_id: p.id,
      cantidad_recibida: 1,
      cantidad_esperada: undefined,
      fecha_caducidad: undefined,
      discrepancia: undefined,
    })
    setProductoQuery('')
    setProductosResults([])
    setShowProductoDropdown(false)
  }

  const onSubmit = async (data: CrearRecepcionInput) => {
    setSubmitting(true)
    try {
      const result = await crearRecepcion(data)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Recepción registrada correctamente')
      router.push('/despachador/recepciones')
    } finally {
      setSubmitting(false)
    }
  }

  const watchedItems = watch('items')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {/* Encabezado */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium">Datos de la recepción</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Proveedor */}
          <div className="space-y-1.5">
            <Label>Proveedor (opcional)</Label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={proveedorQuery}
                onChange={(e) => {
                  setProveedorQuery(e.target.value)
                  if (!e.target.value) {
                    setProveedorSeleccionado(null)
                    setValue('proveedor_id', undefined)
                  }
                }}
                placeholder="Buscar proveedor..."
                className="w-full pl-8 pr-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
              {showProveedorDropdown && proveedoresResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {proveedoresResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-surface"
                      onClick={() => handleSelectProveedor(p)}
                    >
                      <span className="font-medium">{p.nombre}</span>
                      {p.rfc && <span className="text-muted-foreground ml-2 text-xs font-mono">{p.rfc}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Almacén */}
          <div className="space-y-1.5">
            <Label htmlFor="almacen_id">Almacén *</Label>
            <Select id="almacen_id" {...register('almacen_id')}>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </Select>
            {errors.almacen_id && <p className="text-xs text-red-600">{errors.almacen_id.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              {...register('fecha')}
            />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Input
              id="notas"
              {...register('notas')}
              placeholder="Observaciones..."
            />
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium">Productos recibidos</h2>
          {errors.items && (
            <p className="text-xs text-red-600">{errors.items.message ?? errors.items.root?.message}</p>
          )}
        </div>

        {/* Buscador de producto */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={productoQuery}
              onChange={(e) => setProductoQuery(e.target.value)}
              placeholder="Agregar producto por nombre o SKU..."
              className="w-full pl-8 pr-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
            {showProductoDropdown && productosResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {productosResults.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-brand-surface"
                    onClick={() => handleSelectProducto(p)}
                  >
                    <span className="font-mono text-xs text-muted-foreground mr-2">{p.sku}</span>
                    <span className="font-medium">{p.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabla de items */}
        {fields.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Producto</th>
                <th className="px-4 py-2 text-center w-28">Esperada</th>
                <th className="px-4 py-2 text-center w-28">Recibida *</th>
                <th className="px-4 py-2 text-center w-32">Caducidad</th>
                <th className="px-4 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const meta = productosMeta.get(watchedItems[index]?.producto_id ?? '')
                return (
                  <tr key={field.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      {meta ? (
                        <div>
                          <p className="font-medium">{meta.nombre}</p>
                          <p className="text-xs text-muted-foreground font-mono">{meta.sku}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        {...register(`items.${index}.cantidad_esperada`, { valueAsNumber: true })}
                        placeholder="—"
                        className="w-full text-center bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        {...register(`items.${index}.cantidad_recibida`, { valueAsNumber: true })}
                        className="w-full text-center bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                      />
                      {errors.items?.[index]?.cantidad_recibida && (
                        <p className="text-xs text-red-600 mt-0.5">{errors.items[index].cantidad_recibida?.message}</p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {meta?.requiere_caducidad ? (
                        <input
                          type="date"
                          {...register(`items.${index}.fecha_caducidad`)}
                          className="w-full bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
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
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            Busca y agrega productos arriba
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting || fields.length === 0}>
          {submitting ? 'Registrando...' : 'Registrar recepción'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/despachador/recepciones')}
          disabled={submitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
