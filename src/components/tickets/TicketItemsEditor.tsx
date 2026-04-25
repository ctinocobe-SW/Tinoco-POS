'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'

import { formatMXN } from '@/lib/utils/format'
import { construirOpciones, type UnidadOpcion } from '@/lib/utils/precio-producto'
import { aprobarTicketConEdicion } from '@/lib/actions/tickets'
import { aprobarTicket } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'
import type { UnidadVenta } from '@/lib/validations/schemas'

interface EditorItem {
  id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  descuento: number
  unidad: UnidadVenta | null
  producto_sku: string
  producto_nombre: string
  // campos de producto para construir opciones
  precio_base: number
  precio_mayoreo: number
  unidad_precio_base: string | null
  unidad_precio_mayoreo: string | null
}

interface TicketItemsEditorProps {
  ticketId: string
  initialItems: EditorItem[]
}

export function TicketItemsEditor({ ticketId, initialItems }: TicketItemsEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState<EditorItem[]>(initialItems)

  const updateItem = (id: string, patch: Partial<EditorItem>) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i))
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const total = items.reduce((acc, i) => acc + i.precio_unitario * i.cantidad - i.descuento, 0)

  const handleAprobarConCambios = () => {
    if (items.length === 0) {
      toast.error('El ticket debe tener al menos un producto')
      return
    }
    startTransition(async () => {
      const result = await aprobarTicketConEdicion(
        ticketId,
        items.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          descuento: i.descuento,
          unidad: i.unidad,
        })),
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Ticket ${result.data?.folio} aprobado`)
      router.push('/admin/tickets')
    })
  }

  const handleAprobarSinCambios = () => {
    startTransition(async () => {
      const result = await aprobarTicket({ ticket_id: ticketId, accion: 'aprobar' })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Ticket aprobado')
      router.push('/admin/tickets')
    })
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wide">
              <th className="pb-2 font-medium">Producto</th>
              <th className="pb-2 font-medium w-36">Unidad</th>
              <th className="pb-2 font-medium text-right w-24">Cant.</th>
              <th className="pb-2 font-medium text-right w-32">Precio unit.</th>
              <th className="pb-2 font-medium text-right w-28">Desc.</th>
              <th className="pb-2 font-medium text-right w-28">Subtotal</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const opciones: UnidadOpcion[] = construirOpciones({
                precio_base: item.precio_base,
                precio_mayoreo: item.precio_mayoreo,
                unidad_precio_base: item.unidad_precio_base,
                unidad_precio_mayoreo: item.unidad_precio_mayoreo,
              })
              const lineSub = item.precio_unitario * item.cantidad - item.descuento
              return (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2">
                    <p className="font-medium">{item.producto_nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.producto_sku}</p>
                  </td>
                  <td className="py-2 pr-3">
                    {opciones.length > 1 ? (
                      <select
                        value={opciones.find((o) => o.unidad === item.unidad && o.precio === item.precio_unitario)?.key ?? opciones[0]?.key ?? ''}
                        onChange={(e) => {
                          const sel = opciones.find((o) => o.key === e.target.value)
                          if (!sel) return
                          updateItem(item.id, { unidad: sel.unidad, precio_unitario: sel.precio })
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
                      <span className="text-xs text-muted-foreground">{item.unidad ?? '—'}</span>
                    )}
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0.001}
                      step="any"
                      value={item.cantidad}
                      onChange={(e) => updateItem(item.id, { cantidad: Math.max(0.001, Number(e.target.value) || 0.001) })}
                      className="w-full text-right bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.precio_unitario}
                      onChange={(e) => updateItem(item.id, { precio_unitario: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full text-right bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.descuento}
                      onChange={(e) => updateItem(item.id, { descuento: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full text-right bg-white border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">{formatMXN(lineSub)}</td>
                  <td className="py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex justify-end">
        <div className="w-56 text-sm">
          <div className="flex justify-between font-semibold border-t border-border pt-2">
            <span>Total estimado</span>
            <span>{formatMXN(total)}</span>
          </div>
        </div>
      </div>

      {/* Acciones de aprobación */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Button
          onClick={handleAprobarConCambios}
          disabled={isPending || items.length === 0}
        >
          <Check size={14} className="mr-1.5" />
          {isPending ? 'Guardando...' : 'Guardar cambios y aprobar'}
        </Button>
        <Button
          variant="outline"
          onClick={handleAprobarSinCambios}
          disabled={isPending}
        >
          Aprobar sin cambios
        </Button>
      </div>
    </div>
  )
}
