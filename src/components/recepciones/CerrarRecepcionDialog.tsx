'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cerrarRecepcion } from '@/lib/actions/recepciones'
import { blurOnWheel } from '@/lib/utils/input-handlers'
import { formatMXN } from '@/lib/utils/format'

interface ItemCierre {
  id: string
  producto_nombre: string
  sku: string
  cantidad_recibida: number
  costo_unitario: number | null
  costo_actual_producto: number | null
}

interface CerrarRecepcionDialogProps {
  recepcionId: string
  items: ItemCierre[]
  montoFactura: number | null
}

const COSTO_INPUT_CLASS =
  'w-full text-right bg-white border border-border rounded-md px-3 h-11 text-base font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent'

export function CerrarRecepcionDialog({ recepcionId, items, montoFactura }: CerrarRecepcionDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [actualizarCosto, setActualizarCosto] = useState(true)
  const [costos, setCostos] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const it of items) {
      initial[it.id] = it.costo_unitario != null
        ? String(it.costo_unitario)
        : it.costo_actual_producto != null
          ? String(it.costo_actual_producto)
          : ''
    }
    return initial
  })

  const total = items.reduce((acc, it) => {
    const c = parseFloat(costos[it.id] ?? '0')
    if (Number.isNaN(c)) return acc
    return acc + c * Number(it.cantidad_recibida)
  }, 0)

  const handleCerrar = () => {
    const costosArray = items.map((it) => {
      const raw = costos[it.id]
      const parsed = parseFloat(raw)
      return {
        item_id: it.id,
        costo_unitario: Number.isFinite(parsed) ? parsed : NaN,
      }
    })
    if (costosArray.some((c) => !Number.isFinite(c.costo_unitario) || c.costo_unitario < 0)) {
      toast.error('Captura un costo válido para todos los productos')
      return
    }

    startTransition(async () => {
      const result = await cerrarRecepcion({
        recepcion_id: recepcionId,
        costos: costosArray,
        actualizar_costo_producto: actualizarCosto,
      })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Recepción cerrada — inventario actualizado')
      setOpen(false)
      router.refresh()
    })
  }

  const diferenciaFactura = montoFactura != null ? Math.abs(total - montoFactura) : 0
  const cuadra = montoFactura == null || diferenciaFactura <= 0.01

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Lock size={14} className="mr-1.5" />
        Cerrar y aplicar a inventario
      </Button>

      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Cerrar recepción"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Captura el costo unitario de cada producto. Las cantidades del checador se aplicarán al inventario.
          </p>

          {/* DESKTOP: tabla */}
          <div className="hidden sm:block border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-surface text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="text-left px-3 py-2">Producto</th>
                  <th className="text-center px-3 py-2 w-24">Cantidad</th>
                  <th className="text-right px-3 py-2 w-36">Costo unit.</th>
                  <th className="text-right px-3 py-2 w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const costo = parseFloat(costos[it.id] ?? '0')
                  const sub = Number.isFinite(costo) ? costo * Number(it.cantidad_recibida) : 0
                  return (
                    <tr key={it.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <p className="font-medium">{it.producto_nombre}</p>
                        <p className="text-xs text-muted-foreground font-mono">{it.sku}</p>
                      </td>
                      <td className="px-3 py-2 text-center font-medium">{Number(it.cantidad_recibida)}</td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          onWheel={blurOnWheel}
                          value={costos[it.id] ?? ''}
                          onChange={(e) => setCostos((prev) => ({ ...prev, [it.id]: e.target.value }))}
                          className={COSTO_INPUT_CLASS}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{formatMXN(sub)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE: cards */}
          <ul className="sm:hidden divide-y divide-border border border-border rounded-md">
            {items.map((it) => {
              const costo = parseFloat(costos[it.id] ?? '0')
              const sub = Number.isFinite(costo) ? costo * Number(it.cantidad_recibida) : 0
              return (
                <li key={it.id} className="px-3 py-3 space-y-2">
                  <div>
                    <p className="font-medium leading-tight">{it.producto_nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">{it.sku}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <p className="text-xs text-muted-foreground">Cantidad</p>
                      <p className="text-base font-medium">{Number(it.cantidad_recibida)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Costo unitario</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        onWheel={blurOnWheel}
                        value={costos[it.id] ?? ''}
                        onChange={(e) => setCostos((prev) => ({ ...prev, [it.id]: e.target.value }))}
                        className={COSTO_INPUT_CLASS}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-right text-muted-foreground">
                    Subtotal: <span className="text-foreground font-medium">{formatMXN(sub)}</span>
                  </p>
                </li>
              )
            })}
          </ul>

          {/* Totales */}
          <div className="border border-border rounded-md p-3 bg-brand-surface space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total calculado</span>
              <span className="font-medium">{formatMXN(total)}</span>
            </div>
            {montoFactura != null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto factura</span>
                <span className={`font-medium ${cuadra ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {formatMXN(montoFactura)}
                  {!cuadra && (
                    <span className="text-xs ml-2">
                      (Δ {formatMXN(total - montoFactura)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={actualizarCosto}
              onChange={(e) => setActualizarCosto(e.target.checked)}
              className="mt-0.5"
            />
            <span>Actualizar último costo en el catálogo de productos</span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleCerrar} disabled={pending} className="w-full sm:w-auto">
              {pending ? 'Cerrando...' : 'Cerrar y aplicar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
