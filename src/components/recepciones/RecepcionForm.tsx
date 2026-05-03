'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Trash2, Search } from 'lucide-react'

import {
  crearRecepcionSchema,
  DISCREPANCIA_TIPOS,
} from '@/lib/validations/schemas'
import type {
  CrearRecepcionInput,
  DiscrepanciaTipo,
} from '@/lib/validations/schemas'
import { crearRecepcion, actualizarRecepcion } from '@/lib/actions/recepciones'
import { searchProveedores } from '@/lib/queries/proveedores'
import { searchProductos } from '@/lib/queries/productos'
import { blurOnWheel } from '@/lib/utils/input-handlers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface Almacen { id: string; nombre: string; tipo: string }
interface Zona { id: string; nombre: string; almacen_id: string; despachador_nombre: string | null }
interface Despachador { id: string; nombre: string }
interface ProveedorOpt { id: string; nombre: string; rfc: string | null }
interface ProductoMeta { id: string; sku: string; nombre: string; requiere_caducidad: boolean }

interface RecepcionFormProps {
  almacenes: Almacen[]
  zonas: Zona[]
  despachadores: Despachador[]
  defaultProveedor?: ProveedorOpt | null
  initial?: {
    recepcion_id: string
    proveedor_id: string | null
    almacen_id: string
    despachador_responsable_id: string | null
    fecha: string
    fecha_factura: string | null
    folio_factura: string | null
    monto_factura: number | null
    notas: string | null
    items: Array<{
      producto_id: string
      sku: string
      nombre: string
      requiere_caducidad: boolean
      cantidad_esperada: number | null
      cantidad_recibida: number
      fecha_caducidad: string | null
      discrepancia_tipo: DiscrepanciaTipo | null
      discrepancia: string | null
      zona_id: string | null
    }>
  }
  cancelHref?: string
  successHref?: string
}

const DISCREPANCIA_LABELS: Record<DiscrepanciaTipo, string> = {
  faltante: 'Faltante',
  sobrante: 'Sobrante',
  danado: 'Dañado',
  devolucion: 'Devolución',
}

// Inputs grandes para captura de cantidades — pensado para tablet/celular en bodega
const QTY_INPUT_CLASS =
  'w-full text-center bg-white border border-border rounded-md px-3 h-11 text-base font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent'
const FIELD_INPUT_CLASS =
  'w-full bg-white border border-border rounded-md px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent'

export function RecepcionForm({
  almacenes,
  zonas,
  despachadores,
  defaultProveedor = null,
  initial,
  cancelHref = '/checador/recepciones',
}: RecepcionFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [proveedorQuery, setProveedorQuery] = useState(defaultProveedor?.nombre ?? '')
  const [proveedoresResults, setProveedoresResults] = useState<ProveedorOpt[]>([])
  const [showProveedorDropdown, setShowProveedorDropdown] = useState(false)

  const [productoQuery, setProductoQuery] = useState('')
  const [productosResults, setProductosResults] = useState<any[]>([])
  const [showProductoDropdown, setShowProductoDropdown] = useState(false)

  const initialMeta = new Map<string, ProductoMeta>()
  if (initial) {
    for (const it of initial.items) {
      initialMeta.set(it.producto_id, {
        id: it.producto_id,
        sku: it.sku,
        nombre: it.nombre,
        requiere_caducidad: it.requiere_caducidad,
      })
    }
  }
  const [productosMeta, setProductosMeta] = useState<Map<string, ProductoMeta>>(initialMeta)

  const form = useForm<CrearRecepcionInput>({
    resolver: zodResolver(crearRecepcionSchema),
    defaultValues: initial
      ? {
          proveedor_id: initial.proveedor_id ?? undefined,
          almacen_id: initial.almacen_id,
          despachador_responsable_id: initial.despachador_responsable_id ?? undefined,
          fecha: initial.fecha,
          fecha_factura: initial.fecha_factura ?? undefined,
          folio_factura: initial.folio_factura ?? undefined,
          monto_factura: initial.monto_factura ?? undefined,
          notas: initial.notas ?? '',
          items: initial.items.map((it) => ({
            producto_id: it.producto_id,
            cantidad_esperada: it.cantidad_esperada ?? undefined,
            cantidad_recibida: Number(it.cantidad_recibida),
            fecha_caducidad: it.fecha_caducidad ?? undefined,
            discrepancia_tipo: it.discrepancia_tipo ?? undefined,
            discrepancia: it.discrepancia ?? undefined,
            zona_id: it.zona_id ?? undefined,
          })),
        }
      : {
          proveedor_id: defaultProveedor?.id,
          almacen_id: almacenes[0]?.id ?? '',
          despachador_responsable_id: undefined,
          fecha: new Date().toISOString().split('T')[0],
          fecha_factura: undefined,
          folio_factura: '',
          monto_factura: undefined,
          notas: '',
          items: [],
        },
  })

  const { register, handleSubmit, control, setValue, formState: { errors }, watch } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchedAlmacenId = watch('almacen_id')
  const watchedItems = watch('items')

  const zonasDelAlmacen = zonas.filter((z) => z.almacen_id === watchedAlmacenId)

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

  const handleSelectProveedor = (p: ProveedorOpt) => {
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
      discrepancia_tipo: undefined,
      discrepancia: undefined,
      zona_id: undefined,
    })
    setProductoQuery('')
    setProductosResults([])
    setShowProductoDropdown(false)
  }

  const onSubmit = async (data: CrearRecepcionInput) => {
    setSubmitting(true)
    try {
      const result = initial
        ? await actualizarRecepcion({ recepcion_id: initial.recepcion_id, ...data })
        : await crearRecepcion(data)
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success(initial ? 'Recepción actualizada' : 'Recepción registrada')
      const id = (result as any).data?.id ?? initial?.recepcion_id
      router.push(id ? `${cancelHref}/${id}` : cancelHref)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      {/* Encabezado */}
      <div className="border border-border rounded-lg p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-medium">Datos de la recepción</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Proveedor */}
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={proveedorQuery}
                onChange={(e) => {
                  setProveedorQuery(e.target.value)
                  if (!e.target.value) setValue('proveedor_id', undefined)
                }}
                placeholder="Buscar proveedor..."
                className="w-full pl-9 pr-3 h-10 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
              />
              {showProveedorDropdown && proveedoresResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
                  {proveedoresResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-surface"
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

          <div className="space-y-1.5">
            <Label htmlFor="almacen_id">Almacén que recibe *</Label>
            <Select id="almacen_id" {...register('almacen_id')}>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.tipo})
                </option>
              ))}
            </Select>
            {errors.almacen_id && <p className="text-xs text-red-600">{errors.almacen_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="despachador_responsable_id">Despachador que acomodará</Label>
            <Select id="despachador_responsable_id" {...register('despachador_responsable_id')}>
              <option value="">— Sin asignar —</option>
              {despachadores.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha de recepción</Label>
            <Input id="fecha" type="date" {...register('fecha')} />
          </div>
        </div>

        {/* Datos de factura */}
        <div className="border-t border-border pt-4">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Factura del proveedor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="folio_factura">Folio</Label>
              <Input id="folio_factura" {...register('folio_factura')} placeholder="A-12345" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha_factura">Fecha de factura</Label>
              <Input id="fecha_factura" type="date" {...register('fecha_factura')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monto_factura">Monto total</Label>
              <Input
                id="monto_factura"
                type="number"
                step="0.01"
                min="0"
                onWheel={blurOnWheel}
                {...register('monto_factura', { valueAsNumber: true })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            El PDF / imagen de la factura se sube desde la pantalla de detalle, después de guardar.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas</Label>
          <Input id="notas" {...register('notas')} placeholder="Observaciones..." />
        </div>
      </div>

      {/* Productos */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Productos recibidos ({fields.length})</h2>
          {errors.items && (
            <p className="text-xs text-red-600">{errors.items.message ?? errors.items.root?.message}</p>
          )}
        </div>

        {/* Buscador */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative w-full sm:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={productoQuery}
              onChange={(e) => setProductoQuery(e.target.value)}
              placeholder="Agregar producto por nombre o SKU..."
              className="w-full pl-9 pr-3 h-10 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
            />
            {showProductoDropdown && productosResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
                {productosResults.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-surface"
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

        {fields.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm">
            Busca y agrega productos arriba
          </div>
        ) : (
          <>
            {/* DESKTOP: tabla con inputs grandes */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-center w-28">Esperada</th>
                    <th className="px-3 py-2 text-center w-28">Recibida *</th>
                    <th className="px-3 py-2 text-center w-36">Caducidad</th>
                    <th className="px-3 py-2 text-left w-44">Discrepancia</th>
                    <th className="px-3 py-2 text-left w-40">Zona</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const meta = productosMeta.get(watchedItems[index]?.producto_id ?? '')
                    const esperada = watchedItems[index]?.cantidad_esperada
                    const recibida = watchedItems[index]?.cantidad_recibida
                    const muestraDiff =
                      esperada != null &&
                      !Number.isNaN(Number(esperada)) &&
                      Number(esperada) !== Number(recibida)
                    return (
                      <tr key={field.id} className="border-b border-border last:border-0 align-top">
                        <td className="px-3 py-3">
                          {meta ? (
                            <div>
                              <p className="font-medium">{meta.nombre}</p>
                              <p className="text-xs text-muted-foreground font-mono">{meta.sku}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            inputMode="decimal"
                            onWheel={blurOnWheel}
                            {...register(`items.${index}.cantidad_esperada`, { valueAsNumber: true })}
                            placeholder="—"
                            className={QTY_INPUT_CLASS}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            inputMode="decimal"
                            onWheel={blurOnWheel}
                            {...register(`items.${index}.cantidad_recibida`, { valueAsNumber: true })}
                            className={`${QTY_INPUT_CLASS} ${
                              muestraDiff ? '!border-amber-400 !bg-amber-50' : ''
                            }`}
                          />
                          {errors.items?.[index]?.cantidad_recibida && (
                            <p className="text-xs text-red-600 mt-1">
                              {errors.items[index]?.cantidad_recibida?.message}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {meta?.requiere_caducidad ? (
                            <input
                              type="date"
                              {...register(`items.${index}.fecha_caducidad`)}
                              className={FIELD_INPUT_CLASS}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="px-2 py-3 space-y-1.5">
                          <select
                            {...register(`items.${index}.discrepancia_tipo`)}
                            className={FIELD_INPUT_CLASS}
                          >
                            <option value="">—</option>
                            {DISCREPANCIA_TIPOS.map((tipo) => (
                              <option key={tipo} value={tipo}>{DISCREPANCIA_LABELS[tipo]}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            {...register(`items.${index}.discrepancia`)}
                            placeholder="Nota..."
                            className={`${FIELD_INPUT_CLASS} text-xs`}
                          />
                        </td>
                        <td className="px-2 py-3">
                          {zonasDelAlmacen.length > 0 ? (
                            <select
                              {...register(`items.${index}.zona_id`)}
                              className={FIELD_INPUT_CLASS}
                            >
                              <option value="">Sin zona</option>
                              {zonasDelAlmacen.map((z) => (
                                <option key={z.id} value={z.id}>
                                  {z.nombre}{z.despachador_nombre ? ` (${z.despachador_nombre})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-muted-foreground hover:text-red-600 transition-colors p-2"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE: cada item como tarjeta */}
            <ul className="md:hidden divide-y divide-border">
              {fields.map((field, index) => {
                const meta = productosMeta.get(watchedItems[index]?.producto_id ?? '')
                const esperada = watchedItems[index]?.cantidad_esperada
                const recibida = watchedItems[index]?.cantidad_recibida
                const muestraDiff =
                  esperada != null &&
                  !Number.isNaN(Number(esperada)) &&
                  Number(esperada) !== Number(recibida)
                return (
                  <li key={field.id} className="px-4 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{meta?.nombre ?? '—'}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{meta?.sku}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-muted-foreground hover:text-red-600 p-2 -m-2"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Esperada</Label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          inputMode="decimal"
                          onWheel={blurOnWheel}
                          {...register(`items.${index}.cantidad_esperada`, { valueAsNumber: true })}
                          placeholder="—"
                          className={QTY_INPUT_CLASS}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Recibida *</Label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          inputMode="decimal"
                          onWheel={blurOnWheel}
                          {...register(`items.${index}.cantidad_recibida`, { valueAsNumber: true })}
                          className={`${QTY_INPUT_CLASS} ${
                            muestraDiff ? '!border-amber-400 !bg-amber-50' : ''
                          }`}
                        />
                        {errors.items?.[index]?.cantidad_recibida && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.items[index]?.cantidad_recibida?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {meta?.requiere_caducidad && (
                      <div className="space-y-1">
                        <Label className="text-xs">Caducidad</Label>
                        <input
                          type="date"
                          {...register(`items.${index}.fecha_caducidad`)}
                          className={FIELD_INPUT_CLASS}
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs">Discrepancia</Label>
                      <select
                        {...register(`items.${index}.discrepancia_tipo`)}
                        className={FIELD_INPUT_CLASS}
                      >
                        <option value="">— Sin discrepancia —</option>
                        {DISCREPANCIA_TIPOS.map((tipo) => (
                          <option key={tipo} value={tipo}>{DISCREPANCIA_LABELS[tipo]}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        {...register(`items.${index}.discrepancia`)}
                        placeholder="Nota sobre la discrepancia..."
                        className={FIELD_INPUT_CLASS}
                      />
                    </div>

                    {zonasDelAlmacen.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Zona</Label>
                        <select
                          {...register(`items.${index}.zona_id`)}
                          className={FIELD_INPUT_CLASS}
                        >
                          <option value="">Sin zona</option>
                          {zonasDelAlmacen.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.nombre}{z.despachador_nombre ? ` (${z.despachador_nombre})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {/* Acciones — sticky en móvil para que siempre se vea */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sticky bottom-0 bg-brand-bg pt-3 pb-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(cancelHref)}
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting || fields.length === 0}
          className="w-full sm:w-auto"
        >
          {submitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Guardar recepción'}
        </Button>
      </div>
    </form>
  )
}
