'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { enviarAvisoProveedor, type AlertaReorden } from '@/lib/actions/alertasReorden'

interface Props {
  alertas: AlertaReorden[]
}

export function AlertasReordenTable({ alertas }: Props) {
  const [enviando, setEnviando] = useState<string | null>(null)

  const handleEnviar = async (productoId: string, almacenId: string) => {
    const key = `${productoId}-${almacenId}`
    setEnviando(key)
    const res = await enviarAvisoProveedor(productoId, almacenId)
    setEnviando(null)
    if (res.error) { toast.error(res.error); return }
    if ((res as any).data?.estado === 'simulado') {
      toast.success('Aviso registrado (simulado, BSP no configurado)')
    } else {
      toast.success('Aviso enviado al proveedor')
    }
  }

  if (alertas.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
        <AlertTriangle size={24} className="mx-auto mb-3 opacity-30" />
        Sin alertas: ningún producto está bajo el mínimo en bodegas.
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-brand-surface">
          <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
            <th className="px-3 py-2 text-left">Producto</th>
            <th className="px-3 py-2 text-left">Bodega</th>
            <th className="px-3 py-2 text-right w-24">Stock</th>
            <th className="px-3 py-2 text-right w-24">Mínimo</th>
            <th className="px-3 py-2 text-left">Proveedor</th>
            <th className="px-3 py-2 text-left">Contacto</th>
            <th className="px-3 py-2 w-44"></th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((a) => {
            const key = `${a.producto_id}-${a.almacen_id}`
            const numero = a.proveedor_whatsapp || a.proveedor_telefono
            return (
              <tr key={key} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <p className="font-medium text-xs">{a.producto_nombre}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {a.sku} · {a.unidad}
                  </p>
                </td>
                <td className="px-3 py-2 text-xs">{a.almacen_nombre}</td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                  {a.stock_actual}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{a.stock_minimo}</td>
                <td className="px-3 py-2 text-xs">{a.proveedor_nombre ?? '—'}</td>
                <td className="px-3 py-2 text-xs font-mono">{numero ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!numero || enviando === key}
                    onClick={() => handleEnviar(a.producto_id, a.almacen_id)}
                  >
                    <MessageCircle size={13} className="mr-1.5" />
                    {enviando === key ? 'Enviando...' : 'Avisar WhatsApp'}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
