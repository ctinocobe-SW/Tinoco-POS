'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, AlertTriangle } from 'lucide-react'

import { verificarItem, finalizarVerificacion } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { formatMXN } from '@/lib/utils/format'

interface ChecklistItem {
  id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  verificado: boolean
  discrepancia_tipo: string | null
  discrepancia_nota: string | null
  producto_nombre: string
  producto_sku: string
}

interface VerificationChecklistProps {
  ticketId: string
  items: ChecklistItem[]
}

export function VerificationChecklist({ ticketId, items: initialItems }: VerificationChecklistProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState(initialItems)

  const verificados = items.filter((i) => i.verificado).length
  const conDiscrepancia = items.filter((i) => i.discrepancia_tipo).length
  const revisados = verificados + conDiscrepancia
  const total = items.length

  const handleVerificar = (itemId: string, verificado: boolean) => {
    startTransition(async () => {
      const result = await verificarItem({
        ticket_item_id: itemId,
        verificado,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, verificado, discrepancia_tipo: verificado ? null : i.discrepancia_tipo, discrepancia_nota: verificado ? null : i.discrepancia_nota }
            : i
        )
      )
    })
  }

  const handleDiscrepancia = (itemId: string, tipo: string, nota: string) => {
    startTransition(async () => {
      const result = await verificarItem({
        ticket_item_id: itemId,
        verificado: false,
        discrepancia_tipo: tipo || null,
        discrepancia_nota: nota || null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, verificado: false, discrepancia_tipo: tipo || null, discrepancia_nota: nota || null }
            : i
        )
      )
    })
  }

  const handleFinalizar = () => {
    startTransition(async () => {
      const result = await finalizarVerificacion(ticketId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        result.data!.estado === 'verificado'
          ? 'Ticket verificado correctamente'
          : 'Ticket marcado con incidencias'
      )
      router.push('/checador')
    })
  }

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div className="flex items-center justify-between bg-brand-surface rounded-lg p-4">
        <span className="text-sm">
          {revisados} de {total} items revisados
        </span>
        <div className="w-48 bg-brand-muted rounded-full h-2">
          <div
            className="bg-brand-accent rounded-full h-2 transition-all"
            style={{ width: `${total > 0 ? (revisados / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-medium text-sm">{item.producto_nombre}</span>
                <span className="text-xs text-muted-foreground ml-2">{item.producto_sku}</span>
              </div>
              <div className="text-sm text-right">
                <span className="text-muted-foreground">Cant: </span>
                <span className="font-medium">{Number(item.cantidad)}</span>
                <span className="text-muted-foreground ml-3">{formatMXN(Number(item.subtotal))}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <Button
                size="sm"
                variant={item.verificado ? 'default' : 'outline'}
                onClick={() => handleVerificar(item.id, true)}
                disabled={isPending}
              >
                <Check size={14} className="mr-1" />
                Correcto
              </Button>
              <Button
                size="sm"
                variant={item.discrepancia_tipo ? 'destructive' : 'outline'}
                onClick={() => {
                  if (!item.discrepancia_tipo) {
                    handleDiscrepancia(item.id, 'faltante', '')
                  }
                }}
                disabled={isPending}
              >
                <AlertTriangle size={14} className="mr-1" />
                Incidencia
              </Button>
            </div>

            {/* Campos de discrepancia */}
            {item.discrepancia_tipo && (
              <div className="mt-3 pl-4 border-l-2 border-red-300 space-y-2">
                <Select
                  value={item.discrepancia_tipo}
                  onChange={(e) => handleDiscrepancia(item.id, e.target.value, item.discrepancia_nota ?? '')}
                  className="w-48"
                >
                  <option value="faltante">Faltante</option>
                  <option value="sobrante">Sobrante</option>
                  <option value="incorrecto">Incorrecto</option>
                  <option value="danado">Dañado</option>
                </Select>
                <input
                  type="text"
                  value={item.discrepancia_nota ?? ''}
                  onChange={(e) => handleDiscrepancia(item.id, item.discrepancia_tipo!, e.target.value)}
                  placeholder="Nota sobre la incidencia..."
                  className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Finalizar */}
      {revisados === total && total > 0 && (
        <div className="border-t border-border pt-4">
          <Button onClick={handleFinalizar} disabled={isPending} className="w-full">
            {isPending ? 'Finalizando...' : 'Finalizar verificación'}
          </Button>
        </div>
      )}
    </div>
  )
}
