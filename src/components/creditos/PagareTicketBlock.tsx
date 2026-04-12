'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatMXN, formatDate } from '@/lib/utils/format'
import { montoALetras } from '@/lib/utils/numerosALetras'
import { Printer } from 'lucide-react'

interface Props {
  ticket: { folio: string; total: number; created_at: string }
  cliente: { nombre: string; rfc: string | null }
  creditoId: string
  items: { cantidad: number; precio_unitario: number; subtotal: number; producto_sku: string; producto_nombre: string }[]
}

interface CreditoInfo {
  monto_original: number
  fecha_otorgamiento: string
  fecha_vencimiento: string
  plazo_dias: number
  tasa_mora_pct: number
  aval_nombre: string | null
  lugar_expedicion: string
}

export function PagareTicketBlock({ ticket, cliente, creditoId, items }: Props) {
  const [credito, setCredito] = useState<CreditoInfo | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('creditos')
      .select('monto_original, fecha_otorgamiento, fecha_vencimiento, plazo_dias, tasa_mora_pct, aval_nombre, lugar_expedicion')
      .eq('id', creditoId)
      .single()
      .then(({ data }) => { if (data) setCredito(data as CreditoInfo) })
  }, [creditoId])

  if (!credito) return (
    <div className="border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
      Cargando pagaré...
    </div>
  )

  return (
    <div className="border-2 border-border rounded-lg p-6 bg-white print:border-black">
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold tracking-widest uppercase">PAGARÉ</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Crédito: {creditoId.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-semibold">{credito.lugar_expedicion}, {formatDate(credito.fecha_otorgamiento)}</p>
            <p className="text-xs text-muted-foreground">Ticket: {ticket.folio}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="text-muted-foreground hover:text-foreground transition-colors print:hidden"
            title="Imprimir"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Monto */}
      <div className="border border-border rounded-lg p-4 mb-5 bg-brand-surface/30">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monto en letra</p>
        <p className="font-semibold text-sm">{montoALetras(credito.monto_original)}</p>
        <p className="text-2xl font-bold mt-1">{formatMXN(credito.monto_original)}</p>
      </div>

      {/* Texto legal */}
      <p className="text-sm leading-relaxed mb-5 text-justify">
        Yo, <strong>{cliente.nombre}</strong>
        {cliente.rfc ? `, con RFC ${cliente.rfc},` : ','} me comprometo
        incondicionalmente a pagar a la orden de <strong>TINOCO</strong> la cantidad de{' '}
        <strong>{formatMXN(credito.monto_original)}</strong> ({montoALetras(credito.monto_original)}),
        el día <strong>{formatDate(credito.fecha_vencimiento)}</strong> en{' '}
        <strong>{credito.lugar_expedicion}</strong>, como contraprestación de los bienes
        detallados a continuación. Este pagaré causa intereses moratorios a razón del{' '}
        <strong>{credito.tasa_mora_pct > 0 ? `${credito.tasa_mora_pct}% diario` : '0%'}</strong>{' '}
        a partir de la fecha de vencimiento.
        {credito.aval_nombre && ` Aval: ${credito.aval_nombre}.`}
      </p>

      {/* Productos */}
      {items.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm border border-border rounded overflow-hidden">
            <thead>
              <tr className="bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-right w-16">Cant.</th>
                <th className="px-3 py-2 text-right w-28">Precio u.</th>
                <th className="px-3 py-2 text-right w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2">
                    <span className="font-medium">{item.producto_nombre}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-2">{item.producto_sku}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{item.cantidad}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMXN(item.precio_unitario)}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{formatMXN(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-brand-surface font-semibold">
                <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={3}>Total</td>
                <td className="px-3 py-2 text-right font-mono">{formatMXN(ticket.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Firmas */}
      <div className="grid grid-cols-2 gap-12 mt-10">
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-12">
            <p className="text-sm font-semibold">{cliente.nombre}</p>
            <p className="text-xs text-muted-foreground">DEUDOR</p>
            {cliente.rfc && <p className="text-xs text-muted-foreground font-mono">{cliente.rfc}</p>}
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-12">
            <p className="text-sm font-semibold">{credito.aval_nombre ?? 'TINOCO'}</p>
            <p className="text-xs text-muted-foreground">{credito.aval_nombre ? 'AVAL / FIADOR' : 'ACREEDOR'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
