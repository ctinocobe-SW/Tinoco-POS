'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Lock size={14} className="mr-1.5" />
        Cerrar y aplicar a inventario
      </Button>

      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Cerrar recepción"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Captura el costo unitario de cada producto. Al cerrar, las cantidades del checador se aplican al inventario.
          </p>

          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-surface text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="text-left px-3 py-2">Producto</th>
                  <th className="text-center px-3 py-2 w-24">Cantidad</th>
                  <th className="text-right px-3 py-2 w-32">Costo unit.</th>
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
                      <td className="px-3 py-2 text-center">{Number(it.cantidad_recibida)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          onWheel={blurOnWheel}
                          value={costos[it.id] ?? ''}
                          onChange={(e) => setCostos((prev) => ({ ...prev, [it.id]: e.target.value }))}
                          className="w-full text-right bg-white border border-border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{formatMXN(sub)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-brand-surface">
                  <td colSpan={3} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">
                    Total calculado
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatMXN(total)}</td>
                </tr>
                {montoFactura != null && (
                  <tr className="bg-brand-surface">
                    <td colSpan={3} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">
                      Monto factura
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${
                      Math.abs(total - montoFactura) > 0.01 ? 'text-amber-600' : 'text-emerald-700'
                    }`}>
                      {formatMXN(montoFactura)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={actualizarCosto}
              onChange={(e) => setActualizarCosto(e.target.checked)}
            />
            Actualizar último costo en el catálogo de productos
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleCerrar} disabled={pending}>
              {pending ? 'Cerrando...' : 'Cerrar y aplicar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
