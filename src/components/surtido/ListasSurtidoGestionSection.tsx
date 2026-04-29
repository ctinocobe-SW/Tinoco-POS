'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, Package, Truck, CheckCheck, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { cambiarEstadoListaSurtido, marcarListaSurtidoEntregada } from '@/lib/actions/listasSurtido'
import type { ListaSurtidoData } from './ListasSurtidoVerificacionSection'

interface Props {
  listas: ListaSurtidoData[]
  rol: 'admin' | 'despachador'
}

const ESTADO_LABEL: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'error' }> = {
  borrador:    { label: 'Borrador',    variant: 'default' },
  confirmada:  { label: 'Confirmada',  variant: 'warning' },
  en_transito: { label: 'En tránsito', variant: 'warning' },
  entregada:   { label: 'Entregada',   variant: 'success' },
  cancelada:   { label: 'Cancelada',   variant: 'error' },
}

function ListaSurtidoGestionCard({
  lista: initialLista,
  rol,
}: {
  lista: ListaSurtidoData
  rol: 'admin' | 'despachador'
}) {
  const [lista, setLista] = useState(initialLista)
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { label, variant } = ESTADO_LABEL[lista.estado] ?? { label: lista.estado, variant: 'default' }
  const total = lista.items.length
  const checados = lista.items.filter((i) => i.checado_checador).length

  const handleAvanzar = (nuevoEstado: 'confirmada' | 'en_transito' | 'cancelada') => {
    startTransition(async () => {
      const res = await cambiarEstadoListaSurtido(lista.id, nuevoEstado)
      if (res.error) { toast.error(res.error); return }
      setLista((prev) => ({ ...prev, estado: nuevoEstado }))
      toast.success(`Lista marcada como ${ESTADO_LABEL[nuevoEstado]?.label}`)
    })
  }

  const handleMarcarEntregada = () => {
    startTransition(async () => {
      const res = await marcarListaSurtidoEntregada(lista.id)
      if (res.error) { toast.error(res.error); return }
      setLista((prev) => ({ ...prev, estado: 'entregada' }))
      toast.success('Lista entregada — inventario actualizado')
    })
  }

  const sinOrigen = lista.items.filter((i) => !i.almacen_origen_nombre).length

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
            <Badge variant={variant}>{label}</Badge>
            {sinOrigen > 0 && lista.estado !== 'entregada' && lista.estado !== 'cancelada' && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle size={11} />
                {sinOrigen} sin bodega origen
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package size={11} />
              {total} producto{total !== 1 ? 's' : ''}
            </span>
            {(lista.estado === 'confirmada' || lista.estado === 'en_transito') && (
              <span>{checados}/{total} verificados por checador</span>
            )}
            <span>{formatDate(lista.created_at)}</span>
          </div>
        </div>
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
                  <th className="px-4 py-2 text-center w-24">Checador</th>
                </tr>
              </thead>
              <tbody>
                {lista.items.map((item) => (
                  <tr key={item.id} className={cn('border-t border-border', item.entregado && 'bg-green-50/60')}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-sm">{item.producto_nombre}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {item.producto_sku}{item.unidad ? ` · ${item.unidad}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{item.cantidad}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {item.almacen_origen_nombre ?? (
                        <span className="text-amber-600">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs">
                      {item.checado_checador
                        ? <span className="text-green-600 font-medium">✓</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Acciones por estado */}
          {lista.estado !== 'entregada' && lista.estado !== 'cancelada' && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => handleAvanzar('cancelada')}
                className="text-red-600 hover:text-red-700 hover:border-red-400"
              >
                Cancelar
              </Button>
              <div className="flex gap-2">
                {lista.estado === 'borrador' && (
                  <Button size="sm" onClick={() => handleAvanzar('confirmada')} disabled={isPending}>
                    <Truck size={13} className="mr-1.5" />
                    Confirmar lista
                  </Button>
                )}
                {lista.estado === 'confirmada' && (
                  <Button size="sm" onClick={() => handleAvanzar('en_transito')} disabled={isPending}>
                    <Truck size={13} className="mr-1.5" />
                    Marcar en tránsito
                  </Button>
                )}
                {lista.estado === 'en_transito' && rol === 'admin' && (
                  <Button size="sm" onClick={handleMarcarEntregada} disabled={isPending}>
                    <CheckCheck size={13} className="mr-1.5" />
                    Confirmar entrega (admin)
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ListasSurtidoGestionSection({ listas, rol }: Props) {
  const activas = listas.filter((l) => !['entregada', 'cancelada'].includes(l.estado))
  const cerradas = listas.filter((l) => ['entregada', 'cancelada'].includes(l.estado))

  if (listas.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
        <Truck size={24} className="mx-auto mb-3 opacity-30" />
        No hay listas de surtido creadas.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {activas.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            En proceso
          </p>
          <div className="space-y-2">
            {activas.map((l) => (
              <ListaSurtidoGestionCard key={l.id} lista={l} rol={rol} />
            ))}
          </div>
        </div>
      )}
      {cerradas.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Cerradas recientes
          </p>
          <div className="space-y-2">
            {cerradas.map((l) => (
              <ListaSurtidoGestionCard key={l.id} lista={l} rol={rol} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
