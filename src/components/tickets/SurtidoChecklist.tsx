'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, PackageCheck, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { marcarListoParaVerificacion } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'
import type { TicketEstado } from '@/types/database.types'

interface Item {
  id: string
  producto_sku: string
  producto_nombre: string
  cantidad: number
}

interface SurtidoChecklistProps {
  ticketId: string
  items: Item[]
  estado: TicketEstado
}

export function SurtidoChecklist({ ticketId, items, estado }: SurtidoChecklistProps) {
  const storageKey = `surtido-${ticketId}`
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Solo interactivo cuando el ticket está aprobado
  const esInteractivo = estado === 'aprobado'

  useEffect(() => {
    if (!esInteractivo) return // no leer localStorage si está bloqueado
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch {}
  }, [storageKey, esInteractivo])

  const toggle = (itemId: string) => {
    if (!esInteractivo) return
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
  }

  const handleMarcarListo = () => {
    startTransition(async () => {
      const result = await marcarListoParaVerificacion(ticketId)
      if (result.error) { toast.error(result.error); return }
      try { localStorage.removeItem(storageKey) } catch {}
      toast.success('Pedido enviado a verificación')
      router.push('/despachador/tickets')
    })
  }

  // Cuando está bloqueado, todos los items aparecen como completados
  const isItemChecked = (id: string) => !esInteractivo || checked.has(id)

  const total = items.length
  const done = esInteractivo ? items.filter((i) => checked.has(i.id)).length : total
  const todoCompleto = done === total && total > 0

  return (
    <div>
      {/* Aviso de solo lectura */}
      {!esInteractivo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-brand-surface border border-border rounded-lg px-3 py-2 mb-4">
          <Lock size={12} />
          <span>Pedido enviado — solo lectura</span>
        </div>
      )}

      {/* Progreso */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{done}</span> / {total} productos listos
        </span>
        {todoCompleto && (
          <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
            ¡Pedido completo!
          </span>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="w-full h-1.5 bg-brand-surface rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {items.map((item) => {
          const itemChecked = isItemChecked(item.id)
          return (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              role={esInteractivo ? 'button' : undefined}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                itemChecked
                  ? 'border-green-200 bg-green-50/50 opacity-60'
                  : 'border-border hover:border-brand-accent hover:bg-brand-surface'
              } ${esInteractivo ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                itemChecked ? 'bg-green-500 border-green-500' : 'border-border'
              }`}>
                {itemChecked && <Check size={13} className="text-white" strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${itemChecked ? 'line-through text-muted-foreground' : ''}`}>
                  {item.producto_nombre}
                </p>
                <p className="text-xs text-muted-foreground">{item.producto_sku}</p>
              </div>

              <div className={`flex-shrink-0 text-right ${itemChecked ? 'text-muted-foreground' : ''}`}>
                <p className="text-sm font-semibold">{item.cantidad}</p>
                <p className="text-xs text-muted-foreground">pzas</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Botón — solo cuando el ticket está aprobado Y todos los items están marcados */}
      {esInteractivo && (
        <div className="mt-6 pt-4 border-t border-border">
          <Button
            onClick={handleMarcarListo}
            disabled={!todoCompleto || isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
          >
            <PackageCheck size={16} className="mr-2" />
            {isPending ? 'Enviando...' : todoCompleto ? 'Pedido listo — enviar a verificación' : `Marca todos los productos (${done}/${total})`}
          </Button>
        </div>
      )}
    </div>
  )
}
