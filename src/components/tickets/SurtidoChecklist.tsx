'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'

interface Item {
  id: string
  producto_sku: string
  producto_nombre: string
  cantidad: number
}

interface SurtidoChecklistProps {
  ticketId: string
  items: Item[]
}

export function SurtidoChecklist({ ticketId, items }: SurtidoChecklistProps) {
  const storageKey = `surtido-${ticketId}`
  const [checked, setChecked] = useState<Set<string>>(new Set())

  // Cargar estado guardado
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch {}
  }, [storageKey])

  const toggle = (itemId: string) => {
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

  const resetAll = () => {
    setChecked(new Set())
    try { localStorage.removeItem(storageKey) } catch {}
  }

  const total = items.length
  const done = items.filter((i) => checked.has(i.id)).length

  return (
    <div>
      {/* Progreso */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{done}</span> / {total} productos listos
          </span>
          {done === total && total > 0 && (
            <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
              ¡Pedido completo!
            </span>
          )}
        </div>
        {done > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Reiniciar
          </button>
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
          const isChecked = checked.has(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                isChecked
                  ? 'border-green-200 bg-green-50/50 opacity-60'
                  : 'border-border hover:border-brand-accent hover:bg-brand-surface'
              }`}
            >
              {/* Checkbox visual */}
              <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                isChecked ? 'bg-green-500 border-green-500' : 'border-border'
              }`}>
                {isChecked && <Check size={13} className="text-white" strokeWidth={3} />}
              </div>

              {/* Info del producto */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                  {item.producto_nombre}
                </p>
                <p className="text-xs text-muted-foreground">{item.producto_sku}</p>
              </div>

              {/* Cantidad */}
              <div className={`flex-shrink-0 text-right ${isChecked ? 'text-muted-foreground' : ''}`}>
                <p className="text-sm font-semibold">{item.cantidad}</p>
                <p className="text-xs text-muted-foreground">pzas</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
