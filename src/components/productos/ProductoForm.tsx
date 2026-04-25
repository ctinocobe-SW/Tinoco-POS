'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { productoSchema, CATEGORIAS_PRODUCTO } from '@/lib/validations/schemas'
import type { ProductoInput, CategoriaProducto } from '@/lib/validations/schemas'
import { crearProducto, actualizarProducto } from '@/lib/actions/productos'
import { setProveedoresProducto } from '@/lib/actions/configuracion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'

interface Almacen { id: string; nombre: string }
interface ProveedorOption { id: string; nombre: string }

interface ProductoFormProps {
  productoId?: string
  defaultValues?: Partial<ProductoInput>
  almacenes?: Almacen[]
  proveedores?: ProveedorOption[]
  proveedoresIniciales?: string[]
}

function formatTasa(t: number) {
  const pct = t * 100
  return pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1)}%`
}

export function ProductoForm({ productoId, defaultValues, almacenes = [], proveedores = [], proveedoresIniciales = [] }: ProductoFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showImpuestos, setShowImpuestos] = useState(false)
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<string[]>(proveedoresIniciales)
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
      vende_pza: false,
      vende_kg: false,
      vende_caja: false,
      vende_bulto: false,
      piezas_por_caja: undefined,
      piezas_por_bulto: undefined,
      unidad_precio_base: undefined,
      unidad_precio_mayoreo: undefined,
      requiere_caducidad: false,
      fecha_caducidad: undefined,
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
  const vendeCaja = watch('vende_caja')
  const vendeBulto = watch('vende_bulto')
  const requiereCaducidad = watch('requiere_caducidad')
  const tasaIva = watch('tasa_iva') ?? 0.16
  const tasaIeps = watch('tasa_ieps') ?? 0
  const precioBase = Number(watch('precio_base')) || 0
  const precioMayoreo = Number(watch('precio_mayoreo')) || 0

  const toggleProveedor = (id: string) => {
    setProveedoresSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const onSubmit = async (data: ProductoInput) => {
    setSubmitting(true)
    try {
      let pid = productoId
      if (isEdit) {
        const result = await actualizarProducto(productoId, data)
        if (result.error) { toast.error(result.error); return }
      } else {
        const result = await crearProducto(data)
        if (result.error) { toast.error(result.error); return }
        pid = result.data?.id
      }

      if (pid) {
        const rel = await setProveedoresProducto(pid, proveedoresSeleccionados)
        if (rel.error) { toast.error(rel.error); return }
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
      </div>

      {/* Precios e impuestos */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium">Precios</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="precio_base">Precio menudeo (MXN)</Label>
            <Input
              id="precio_base"
              type="number"
              step="0.01"
              min="0"
              {...register('precio_base', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {precioBase > 0 && (
              <Select
                id="unidad_precio_base"
                {...register('unidad_precio_base')}
                className="h-8 text-xs"
              >
                <option value="">Unidad del precio menudeo...</option>
                <option value="pza">Por pieza</option>
                <option value="kg">Por kilogramo</option>
              </Select>
            )}
            {errors.precio_base && <p className="text-xs text-red-600">{errors.precio_base.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="precio_mayoreo">Precio mayoreo (MXN)</Label>
            <Input
              id="precio_mayoreo"
              type="number"
              step="0.01"
              min="0"
              {...register('precio_mayoreo', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {precioMayoreo > 0 && (
              <Select
                id="unidad_precio_mayoreo"
                {...register('unidad_precio_mayoreo')}
                className="h-8 text-xs"
              >
                <option value="">Unidad del precio mayoreo...</option>
                <option value="pza">Por pieza</option>
                <option value="kg">Por kilogramo</option>
                <option value="caja">Por caja</option>
                <option value="bulto">Por bulto</option>
              </Select>
            )}
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

        {/* Toggle impuestos */}
        <div>
          <button
            type="button"
            onClick={() => setShowImpuestos((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showImpuestos
              ? <ChevronDown size={13} />
              : <ChevronRight size={13} />
            }
            Impuestos
            {!showImpuestos && (
              <span className="ml-1 text-foreground font-medium">
                IVA {formatTasa(tasaIva)}
                {tasaIeps > 0 && ` · IEPS ${formatTasa(tasaIeps)}`}
              </span>
            )}
          </button>

          {showImpuestos && (
            <div className="grid grid-cols-2 gap-4 mt-3">
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
          )}
        </div>
      </div>

      {/* Unidades de venta */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-medium">Unidades de venta</h2>
        <div className="grid grid-cols-2 gap-6">
          {/* Menudeo */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Menudeo — usa precio menudeo
            </p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                {...register('vende_pza')}
                className="w-4 h-4 accent-brand-accent"
              />
              <span className="text-sm">Piezas (pza)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                {...register('vende_kg')}
                className="w-4 h-4 accent-brand-accent"
              />
              <span className="text-sm">Kilogramos (kg)</span>
            </label>
          </div>

          {/* Mayoreo */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mayoreo — usa precio mayoreo
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('vende_caja')}
                  className="w-4 h-4 accent-brand-accent"
                />
                <span className="text-sm">Cajas</span>
              </label>
              {vendeCaja && (
                <div className="ml-6 space-y-1">
                  <Label className="text-xs text-muted-foreground">Piezas / kg por caja</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    {...register('piezas_por_caja', { valueAsNumber: true })}
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                  {errors.piezas_por_caja && <p className="text-xs text-red-600">{errors.piezas_por_caja.message}</p>}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('vende_bulto')}
                  className="w-4 h-4 accent-brand-accent"
                />
                <span className="text-sm">Bulto</span>
              </label>
              {vendeBulto && (
                <div className="ml-6 space-y-1">
                  <Label className="text-xs text-muted-foreground">Piezas / kg por bulto</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    {...register('piezas_por_bulto', { valueAsNumber: true })}
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                  {errors.piezas_por_bulto && <p className="text-xs text-red-600">{errors.piezas_por_bulto.message}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logística */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium">Logística</h2>

        <div className="space-y-1.5">
          <Label htmlFor="peso_kg">Peso por unidad (kg)</Label>
          <Input
            id="peso_kg"
            type="number"
            step="0.001"
            min="0"
            {...register('peso_kg', { valueAsNumber: true })}
            placeholder="0.000"
            className="max-w-xs"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              id="requiere_caducidad"
              type="checkbox"
              {...register('requiere_caducidad')}
              className="w-4 h-4 accent-brand-accent"
            />
            <Label htmlFor="requiere_caducidad" className="normal-case text-sm text-foreground cursor-pointer">
              Requiere fecha de caducidad
            </Label>
          </label>
          {requiereCaducidad && (
            <div className="ml-6 space-y-1">
              <Label htmlFor="fecha_caducidad" className="text-xs text-muted-foreground">Fecha de caducidad</Label>
              <Input
                id="fecha_caducidad"
                type="date"
                {...register('fecha_caducidad')}
                className="max-w-xs"
              />
            </div>
          )}
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

      {/* Proveedor */}
      {proveedores.length > 0 && (
        <div className="border border-border rounded-lg p-5 space-y-3">
          <div>
            <h2 className="text-sm font-medium">Proveedor</h2>
            <p className="text-xs text-muted-foreground">Selecciona quién surte este producto</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {proveedores.map((prov) => {
              const selected = proveedoresSeleccionados.includes(prov.id)
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => toggleProveedor(prov.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-brand-accent text-white border-brand-accent'
                      : 'bg-white text-muted-foreground border-border hover:border-brand-accent hover:text-foreground'
                  }`}
                >
                  {prov.nombre}
                </button>
              )
            })}
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
