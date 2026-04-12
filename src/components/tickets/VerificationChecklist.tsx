'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, AlertTriangle, ClipboardCheck } from 'lucide-react'

import { verificarItem, finalizarVerificacion } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

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
  // Track which items have the incidencia panel expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const total = items.length
  const resueltos = items.filter((i) => i.verificado || i.discrepancia_tipo).length
  const conIncidencias = items.filter((i) => i.discrepancia_tipo).length
  const todoResuelto = resueltos === total && total > 0

  const handleToggleVerificado = (item: ChecklistItem) => {
    // If already verified, unverify. If has incidencia, clear it and verify. Otherwise verify.
    const nuevoVerificado = !item.verificado
    const nuevaDiscrepancia = nuevoVerificado ? null : item.discrepancia_tipo

    startTransition(async () => {
      const result = await verificarItem({
        ticket_item_id: item.id,
        verificado: nuevoVerificado,
        discrepancia_tipo: nuevoVerificado ? null : nuevaDiscrepancia,
        discrepancia_nota: nuevoVerificado ? null : item.discrepancia_nota,
      })
      if (result.error) { toast.error(result.error); return }
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, verificado: nuevoVerificado, discrepancia_tipo: nuevoVerificado ? null : i.discrepancia_tipo, discrepancia_nota: nuevoVerificado ? null : i.discrepancia_nota }
            : i
        )
      )
      // Collapse incidencia panel when marking as correct
      if (nuevoVerificado) {
        setExpanded((prev) => { const s = new Set(prev); s.delete(item.id); return s })
      }
    })
  }

  const handleGuardarIncidencia = (itemId: string, tipo: string, nota: string) => {
    startTransition(async () => {
      const result = await verificarItem({
        ticket_item_id: itemId,
        verificado: false,
        discrepancia_tipo: tipo || null,
        discrepancia_nota: nota || null,
      })
      if (result.error) { toast.error(result.error); return }
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
      if (result.error) { toast.error(result.error); return }
      toast.success(
        result.data!.estado === 'verificado'
          ? 'Pedido verificado correctamente'
          : 'Pedido marcado con incidencias'
      )
      router.push('/checador')
    })
  }

  return (
    <div>
      {/* Progreso */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{resueltos}</span> / {total} productos revisados
        </span>
        {conIncidencias > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
            {conIncidencias} incidencia{conIncidencias > 1 ? 's' : ''}
          </span>
        )}
        {todoResuelto && conIncidencias === 0 && (
          <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
            ¡Todo correcto!
          </span>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="w-full h-1.5 bg-brand-surface rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: total > 0 ? `${(resueltos / total) * 100}%` : '0%' }}
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {items.map((item) => {
          const isExpanded = expanded.has(item.id)
          const hasIncidencia = !!item.discrepancia_tipo
          const isResuelto = item.verificado || hasIncidencia

          return (
            <div
              key={item.id}
              className={`rounded-lg border transition-all ${
                item.verificado
                  ? 'border-green-200 bg-green-50/50 opacity-60'
                  : hasIncidencia
                  ? 'border-amber-200 bg-amber-50/50'
                  : 'border-border'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleVerificado(item)}
                disabled={isPending}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                {/* Checkbox */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                  item.verificado
                    ? 'bg-green-500 border-green-500'
                    : hasIncidencia
                    ? 'bg-amber-400 border-amber-400'
                    : 'border-border'
                }`}>
                  {item.verificado && <Check size={13} className="text-white" strokeWidth={3} />}
                  {hasIncidencia && !item.verificado && <AlertTriangle size={11} className="text-white" strokeWidth={3} />}
                </div>

                {/* Nombre y SKU */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${item.verificado ? 'line-through text-muted-foreground' : ''}`}>
                    {item.producto_nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.producto_sku}</p>
                </div>

                {/* Cantidad */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold">{item.cantidad}</p>
                  <p className="text-xs text-muted-foreground">pzas</p>
                </div>
              </button>

              {/* Botón incidencia — solo si no está verificado */}
              {!item.verificado && (
                <div className="px-3 pb-3 pt-0">
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => {
                      const s = new Set(prev)
                      if (s.has(item.id)) { s.delete(item.id) } else { s.add(item.id) }
                      return s
                    })}
                    className="text-xs text-muted-foreground hover:text-amber-600 transition-colors flex items-center gap-1"
                  >
                    <AlertTriangle size={11} />
                    {hasIncidencia ? 'Editar incidencia' : 'Reportar incidencia'}
                  </button>

                  {isExpanded && (
                    <IncidenciaPanel
                      tipo={item.discrepancia_tipo ?? 'faltante'}
                      nota={item.discrepancia_nota ?? ''}
                      isPending={isPending}
                      onSave={(tipo, nota) => {
                        handleGuardarIncidencia(item.id, tipo, nota)
                        setExpanded((prev) => { const s = new Set(prev); s.delete(item.id); return s })
                      }}
                      onCancel={() => setExpanded((prev) => { const s = new Set(prev); s.delete(item.id); return s })}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botón finalizar */}
      {todoResuelto && (
        <div className="mt-6 pt-4 border-t border-border">
          <Button
            onClick={handleFinalizar}
            disabled={isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <ClipboardCheck size={16} className="mr-2" />
            {isPending ? 'Finalizando...' : conIncidencias > 0 ? 'Finalizar con incidencias' : 'Confirmar pedido verificado'}
          </Button>
        </div>
      )}
    </div>
  )
}

function IncidenciaPanel({
  tipo,
  nota,
  isPending,
  onSave,
  onCancel,
}: {
  tipo: string
  nota: string
  isPending: boolean
  onSave: (tipo: string, nota: string) => void
  onCancel: () => void
}) {
  const [localTipo, setLocalTipo] = useState(tipo)
  const [localNota, setLocalNota] = useState(nota)

  return (
    <div className="mt-2 pl-3 border-l-2 border-amber-300 space-y-2">
      <Select
        value={localTipo}
        onChange={(e) => setLocalTipo(e.target.value)}
        className="w-48"
      >
        <option value="faltante">Faltante</option>
        <option value="sobrante">Sobrante</option>
        <option value="incorrecto">Incorrecto</option>
        <option value="danado">Dañado</option>
      </Select>
      <input
        type="text"
        value={localNota}
        onChange={(e) => setLocalNota(e.target.value)}
        placeholder="Descripción de la incidencia..."
        className="w-full bg-white border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onSave(localTipo, localNota)}
          className="text-xs font-medium text-amber-700 hover:text-amber-800 border border-amber-300 rounded px-2 py-1"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
