'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, CheckCheck, Truck, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import {
  toggleItemSurtidoChecado,
  confirmarRecepcionSurtidoChecador,
} from '@/lib/actions/listasSurtido'

export interface ItemSurtidoData {
  id: string
  producto_id: string
  producto_nombre: string
  producto_sku: string
  cantidad: number
  unidad: string | null
  almacen_origen_nombre: string | null
  checado_checador: boolean
  entregado: boolean
}

export interface ListaSurtidoData {
  id: string
  estado: string
  almacen_destino_nombre: string
  notas: string | null
  created_at: string
  items: ItemSurtidoData[]
}

interface Props {
  listas: ListaSurtidoData[]
  rol: 'admin' | 'despachador' | 'checador'
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'error' }> = {
    borrador:   { label: 'Borrador',    variant: 'default' },
    confirmada: { label: 'Confirmada',  variant: 'warning' },
    en_transito:{ label: 'En tránsito', variant: 'warning' },
    entregada:  { label: 'Entregada',   variant: 'success' },
    cancelada:  { label: 'Cancelada',   variant: 'error' },
  }
  const { label, variant } = map[estado] ?? { label: estado, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

function ListaSurtidoCard({
  lista: initialLista,
  rol,
}: {
  lista: ListaSurtidoData
  rol: 'admin' | 'despachador' | 'checador'
}) {
  const [lista, setLista] = useState(initialLista)
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canVerificar = rol === 'admin' || rol === 'checador'
  const pendiente = lista.estado === 'confirmada' || lista.estado === 'en_transito'
  const total = lista.items.length
  const checados = lista.items.filter((i) => i.checado_checador).length
  const progreso = total > 0 ? (checados / total) * 100 : 0

  const handleToggle = (itemId: string, checked: boolean) => {
    if (!canVerificar || !pendiente || isPending) return
    startTransition(async () => {
      const res = await toggleItemSurtidoChecado(itemId, checked)
      if (res.error) { toast.error(res.error); return }
      setLista((prev) => ({
        ...prev,
        items: prev.items.map((i) => i.id === itemId ? { ...i, checado_checador: checked } : i),
      }))
    })
  }

  const handleConfirmar = () => {
    startTransition(async () => {
      const res = await confirmarRecepcionSurtidoChecador(lista.id)
      if (res.error) { toast.error(res.error); return }
      setLista((prev) => ({ ...prev, estado: 'entregada' }))
      toast.success('Surtido confirmado — inventario actualizado')
    })
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-brand-surface/50 transition-colors text-left"
      >
        {expanded
          ? <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          : <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        }

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{lista.almacen_destino_nombre}</span>
            <EstadoBadge estado={lista.estado} />
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package size={11} />
              {total} producto{total !== 1 ? 's' : ''}
            </span>
            {pendiente && (
              <span>{checados}/{total} verificados</span>
            )}
            <span>{formatDate(lista.created_at)}</span>
          </div>
        </div>

        {pendiente && total > 0 && (
          <div className="w-24 shrink-0">
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  progreso === 100 ? 'bg-green-500' : 'bg-brand-accent'
                )}
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right mt-0.5">{Math.round(progreso)}%</p>
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {lista.notas && (
            <p className="px-4 py-2 text-xs text-muted-foreground italic border-b border-border">
              {lista.notas}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">Producto</th>
                  <th className="px-4 py-2 text-right w-24">Cantidad</th>
                  <th className="px-4 py-2 text-left w-36">Bodega origen</th>
                  {canVerificar && pendiente && <th className="px-4 py-2 text-center w-14">✓</th>}
                </tr>
              </thead>
              <tbody>
                {lista.items.map((item) => (
                  <tr
                    key={item.id}
                    className={cn('border-t border-border', item.checado_checador && 'bg-green-50/60')}
                  >
                    <td className="px-4 py-2.5">
                      <p className={cn('font-medium text-sm', item.checado_checador && 'line-through text-muted-foreground')}>
                        {item.producto_nombre}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {item.producto_sku}{item.unidad ? ` · ${item.unidad}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{item.cantidad}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {item.almacen_origen_nombre ?? <span className="text-amber-600">Sin asignar</span>}
                    </td>
                    {canVerificar && pendiente && (
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.checado_checador}
                          disabled={isPending}
                          onChange={(e) => handleToggle(item.id, e.target.checked)}
                          className="w-4 h-4 accent-brand-accent cursor-pointer"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canVerificar && pendiente && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {checados === total
                  ? 'Todos los productos verificados. Confirma para actualizar inventario.'
                  : `Verifica cada producto antes de confirmar (${total - checados} pendiente${total - checados !== 1 ? 's' : ''}).`
                }
              </p>
              <Button
                size="sm"
                onClick={handleConfirmar}
                disabled={isPending || checados < total}
              >
                <CheckCheck size={13} className="mr-1.5" />
                Confirmar recepción
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ListasSurtidoVerificacionSection({ listas, rol }: Props) {
  const pendientes = listas.filter((l) => l.estado === 'confirmada' || l.estado === 'en_transito')
  const entregadas = listas.filter((l) => l.estado === 'entregada')

  if (listas.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
        <Truck size={24} className="mx-auto mb-3 opacity-30" />
        No hay listas de surtido pendientes de verificación.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {pendientes.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Pendientes de verificación
          </p>
          <div className="space-y-2">
            {pendientes.map((l) => (
              <ListaSurtidoCard key={l.id} lista={l} rol={rol} />
            ))}
          </div>
        </div>
      )}

      {entregadas.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Entregadas recientes
          </p>
          <div className="space-y-2">
            {entregadas.map((l) => (
              <ListaSurtidoCard key={l.id} lista={l} rol={rol} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
