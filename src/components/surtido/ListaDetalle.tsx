'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, CheckCheck, Package, Scale } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { toggleItemChecado, finalizarListaAlmacen } from '@/lib/actions/listasAlmacen'

export interface ListaItem {
  id: string
  cantidad: number
  notas: string | null
  checado: boolean
  producto: {
    nombre: string
    sku: string
    peso_kg: number
  }
}

export interface ListaData {
  id: string
  nombre: string
  notas: string | null
  estado: string
  created_at: string
  items: ListaItem[]
}

interface Props {
  lista: ListaData
  rol: 'admin' | 'despachador' | 'checador'
  defaultExpanded?: boolean
}

function formatPeso(kg: number): string {
  if (kg <= 0) return '—'
  if (kg >= 1000) return `${(kg / 1000).toFixed(3)} t`
  return `${kg.toFixed(2)} kg`
}

export function ListaDetalle({ lista: initialLista, rol, defaultExpanded = false }: Props) {
  const [lista, setLista] = useState(initialLista)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [isPending, startTransition] = useTransition()

  const canModify = rol === 'admin' || rol === 'checador'

  const totalPeso = lista.items.reduce((s, i) => s + i.cantidad * i.producto.peso_kg, 0)
  const pesoChequeado = lista.items.filter((i) => i.checado).reduce((s, i) => s + i.cantidad * i.producto.peso_kg, 0)
  const checados = lista.items.filter((i) => i.checado).length
  const total = lista.items.length
  const progreso = total > 0 ? (checados / total) * 100 : 0

  const handleToggle = (itemId: string, checked: boolean) => {
    if (!canModify || isPending) return
    startTransition(async () => {
      const result = await toggleItemChecado(itemId, checked)
      if (result.error) { toast.error(result.error); return }
      setLista((prev) => ({
        ...prev,
        items: prev.items.map((i) => i.id === itemId ? { ...i, checado: checked } : i),
      }))
    })
  }

  const handleFinalizar = () => {
    startTransition(async () => {
      const result = await finalizarListaAlmacen(lista.id)
      if (result.error) { toast.error(result.error); return }
      setLista((prev) => ({ ...prev, estado: 'finalizada' }))
      toast.success('Lista finalizada')
    })
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header — clickable */}
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
            <span className="font-medium text-sm">{lista.nombre}</span>
            <Badge variant={lista.estado === 'finalizada' ? 'success' : 'warning'}>
              {lista.estado === 'finalizada' ? 'Finalizada' : 'Borrador'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package size={11} />
              {total} producto{total !== 1 ? 's' : ''}
            </span>
            {totalPeso > 0 && (
              <span className="flex items-center gap-1">
                <Scale size={11} />
                {formatPeso(totalPeso)}
              </span>
            )}
            <span>{checados}/{total} chequeados</span>
            <span>{formatDate(lista.created_at)}</span>
          </div>
        </div>

        {/* Barra de progreso */}
        {total > 0 && (
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

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-border">
          {lista.notas && (
            <p className="px-4 py-2 text-xs text-muted-foreground italic border-b border-border">
              {lista.notas}
            </p>
          )}

          {total === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">Sin productos en esta lista</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">Producto</th>
                  <th className="px-4 py-2 text-right w-24">Cantidad</th>
                  <th className="px-4 py-2 text-right w-24">Peso/u</th>
                  <th className="px-4 py-2 text-right w-28">Peso total</th>
                  {canModify && <th className="px-4 py-2 text-center w-14">✓</th>}
                </tr>
              </thead>
              <tbody>
                {lista.items.map((item) => (
                  <tr
                    key={item.id}
                    className={cn('border-t border-border', item.checado && 'bg-green-50/60')}
                  >
                    <td className="px-4 py-2.5">
                      <p className={cn('font-medium text-sm', item.checado && 'line-through text-muted-foreground')}>
                        {item.producto.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{item.producto.sku}</p>
                      {item.notas && (
                        <p className="text-xs text-muted-foreground italic">{item.notas}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{item.cantidad}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                      {item.producto.peso_kg > 0 ? `${item.producto.peso_kg} kg` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      {formatPeso(item.cantidad * item.producto.peso_kg)}
                    </td>
                    {canModify && (
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.checado}
                          disabled={isPending}
                          onChange={(e) => handleToggle(item.id, e.target.checked)}
                          className="w-4 h-4 accent-brand-accent cursor-pointer"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-brand-surface font-semibold">
                  <td className="px-4 py-2 text-xs text-muted-foreground" colSpan={canModify ? 3 : 3}>
                    {checados > 0
                      ? `${checados}/${total} chequeados · ${formatPeso(pesoChequeado)} verificados`
                      : `${total} productos`
                    }
                  </td>
                  <td className={cn('px-4 py-2 text-right', canModify ? '' : '')} colSpan={canModify ? 2 : 1}>
                    <span className="text-sm">{formatPeso(totalPeso)}</span>
                    {totalPeso >= 1000 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({(totalPeso / 1000).toFixed(3)} t)
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
          )}

          {/* Acciones */}
          {canModify && lista.estado === 'borrador' && (
            <div className="px-4 py-3 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={handleFinalizar} disabled={isPending}>
                <CheckCheck size={13} className="mr-1.5" />
                Finalizar lista
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
