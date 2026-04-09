'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { productoSchema, CATEGORIAS_PRODUCTO } from '@/lib/validations/schemas'
import type { ProductoInput, CategoriaProducto } from '@/lib/validations/schemas'
import { crearProducto, actualizarProducto } from '@/lib/actions/productos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'

interface Almacen { id: string; nombre: string }

interface ProductoFormProps {
  productoId?: string
  defaultValues?: Partial<ProductoInput>
  almacenes?: Almacen[]
}

export function ProductoForm({ productoId, defaultValues, almacenes = [] }: ProductoFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!productoId

  const form = useForm<ProductoInput>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      categoria: 'Otros',
      peso_kg: 0,
      precio_base: 0,
      precio_mayoreo: 0,
      costo: 0,
      tasa_iva: 0.16,
      tasa_ieps: 0,
      requiere_caducidad: false,
      codigo_barras: '',
      stock_inicial: 0,
      almacen_id_inicial: almacenes[0]?.id ?? '',
      ...defaultValues,
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = form

  const categoriaSeleccionada = watch('categoria')
  const stockInicial = watch('stock_inicial') ?? 0

  const onSubmit = async (data: ProductoInput) => {
    setSubmitting(true)
    try {
      const result = isEdit
        ? await actualizarProducto(productoId, data)
        : await crearProducto(data)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado correctamente')
      router.push('/admin/productos')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

      {/* Identificación */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium">Identificación</h2>

        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input
            id="nombre"
            {...register('nombre')}
            placeholder="Nombre del producto"
          />
          {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descripcion">Descripción</Label>
          <textarea
            id="descripcion"
            {...register('descripcion')}
            rows={2}
            placeholder="Descripción opcional..."
            className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label>Categoría</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS_PRODUCTO.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setValue('categoria', cat as CategoriaProducto)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  categoriaSeleccionada === cat
                    ? 'bg-brand-accent text-white border-brand-accent'
                    : 'bg-white text-muted-foreground border-border hover:border-brand-accent hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          {errors.categoria && <p className="text-xs text-red-600">{errors.categoria.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="codigo_barras">Código de barras</Label>
          <Input
            id="codigo_barras"
            {...register('codigo_barras')}
            placeholder="7501000000000"
            className="font-mono"
          />
        </div>
      </div>

      {/* Precios e impuestos */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium">Precios e impuestos</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="precio_base">Precio menudeo (MXN) *</Label>
            <Input
              id="precio_base"
              type="number"
              step="0.01"
              min="0"
              {...register('precio_base', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.precio_base && <p className="text-xs text-red-600">{errors.precio_base.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="precio_mayoreo">Precio mayoreo (MXN) *</Label>
            <Input
              id="precio_mayoreo"
              type="number"
              step="0.01"
              min="0"
              {...register('precio_mayoreo', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.precio_mayoreo && <p className="text-xs text-red-600">{errors.precio_mayoreo.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="costo">Costo (MXN)</Label>
            <Input
              id="costo"
              type="number"
              step="0.01"
              min="0"
              {...register('costo', { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tasa_iva">IVA</Label>
            <Select id="tasa_iva" {...register('tasa_iva', { valueAsNumber: true })}>
              <option value={0}>0%</option>
              <option value={0.08}>8%</option>
              <option value={0.16}>16%</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tasa_ieps">IEPS</Label>
            <Select id="tasa_ieps" {...register('tasa_ieps', { valueAsNumber: true })}>
              <option value={0}>0%</option>
              <option value={0.03}>3%</option>
              <option value={0.06}>6%</option>
              <option value={0.07}>7%</option>
              <option value={0.08}>8%</option>
              <option value={0.09}>9%</option>
              <option value={0.265}>26.5%</option>
              <option value={0.30}>30%</option>
              <option value={0.53}>53%</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Logística */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium">Logística</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="peso_kg">Peso (kg)</Label>
            <Input
              id="peso_kg"
              type="number"
              step="0.001"
              min="0"
              {...register('peso_kg', { valueAsNumber: true })}
              placeholder="0.000"
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              id="requiere_caducidad"
              type="checkbox"
              {...register('requiere_caducidad')}
              className="w-4 h-4 accent-brand-accent"
            />
            <Label htmlFor="requiere_caducidad" className="normal-case text-sm text-foreground">
              Requiere fecha de caducidad
            </Label>
          </div>
        </div>
      </div>

      {/* Stock inicial (solo en creación) */}
      {!isEdit && almacenes.length > 0 && (
        <div className="border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-medium">Stock inicial</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stock_inicial">Cantidad inicial</Label>
              <Input
                id="stock_inicial"
                type="number"
                step="0.001"
                min="0"
                {...register('stock_inicial', { valueAsNumber: true })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Dejar en 0 para registrar el stock más tarde</p>
            </div>

            {Number(stockInicial) > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="almacen_id_inicial">Almacén *</Label>
                <Select id="almacen_id_inicial" {...register('almacen_id_inicial')}>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/productos')}
          disabled={submitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
