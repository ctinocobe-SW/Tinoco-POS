'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AbonoDialog } from './AbonoDialog'
import { liquidarCredito, cancelarCredito } from '@/lib/actions/creditos'
import { formatMXN, formatDate } from '@/lib/utils/format'
import { montoALetras } from '@/lib/utils/numerosALetras'
import { Printer, DollarSign, XCircle, CheckCircle } from 'lucide-react'

const ESTADO_BADGE: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  vigente: 'warning', vencido: 'error', liquidado: 'success', cancelado: 'default',
}
const ESTADO_LABEL: Record<string, string> = {
  vigente: 'Vigente', vencido: 'Vencido', liquidado: 'Liquidado', cancelado: 'Cancelado',
}
const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque', otro: 'Otro',
}

interface AbonoRow {
  id: string; monto: number; fecha: string; metodo_pago: string
  referencia: string | null; notas: string | null; registrado_por: string | null
}
interface TicketItem {
  cantidad: number; precio_unitario: number; subtotal: number
  producto_sku: string; producto_nombre: string
}
interface CreditoDetalle {
  id: string; monto_original: number; saldo: number
  fecha_otorgamiento: string; fecha_vencimiento: string
  plazo_dias: number; tasa_mora_pct: number; estado: string
  aval_nombre: string | null; lugar_expedicion: string
  notas: string | null; otorgado_por: string | null
  cliente: { id: string; nombre: string; rfc: string | null; telefono: string | null; email: string | null }
  ticket: { id: string; folio: string; total: number; created_at: string } | null
  ticket_items: TicketItem[]
  abonos: AbonoRow[]
}

export function CreditoDetalleClient({ credito }: { credito: CreditoDetalle }) {
  const [abonoOpen, setAbonoOpen] = useState(false)
  const [saldo, setSaldo]         = useState(credito.saldo)
  const [estado, setEstado]       = useState(credito.estado)
  const [isPending, startTransition] = useTransition()
  const activo = estado === 'vigente' || estado === 'vencido'
  const totalAbonado = credito.monto_original - saldo

  const handleLiquidar = () => {
    if (!confirm('¿Marcar este crédito como liquidado? Se pondrá el saldo en $0.')) return
    startTransition(async () => {
      const r = await liquidarCredito(credito.id)
      if (r?.error) { toast.error(r.error); return }
      setSaldo(0); setEstado('liquidado'); toast.success('Crédito liquidado')
    })
  }

  const handleCancelar = () => {
    if (!confirm('¿Cancelar este crédito? Esta acción no se puede deshacer.')) return
    startTransition(async () => {
      const r = await cancelarCredito(credito.id)
      if (r?.error) { toast.error(r.error); return }
      setEstado('cancelado'); toast.success('Crédito cancelado')
    })
  }

  return (
    <>
      {/* ── Encabezado ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-heading font-semibold">{credito.cliente.nombre}</h1>
            <Badge variant={ESTADO_BADGE[estado] ?? 'default'}>{ESTADO_LABEL[estado] ?? estado}</Badge>
          </div>
          {credito.cliente.rfc && (
            <p className="text-sm text-muted-foreground font-mono">{credito.cliente.rfc}</p>
          )}
        </div>
        {activo && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setAbonoOpen(true)} disabled={isPending}>
              <DollarSign size={14} className="mr-1.5" />
              Registrar abono
            </Button>
            <Button variant="outline" onClick={handleLiquidar} disabled={isPending}>
              <CheckCircle size={14} className="mr-1.5" />
              Liquidar
            </Button>
            <Button variant="outline" onClick={handleCancelar} disabled={isPending}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
              <XCircle size={14} className="mr-1.5" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* ── Resumen del crédito ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Monto original',    value: formatMXN(credito.monto_original) },
          { label: 'Abonado',           value: formatMXN(totalAbonado) },
          { label: 'Saldo pendiente',   value: formatMXN(saldo),   highlight: saldo > 0 && activo },
          { label: 'Plazo',             value: `${credito.plazo_dias} días` },
        ].map((k) => (
          <div key={k.label} className="border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-xl font-semibold ${k.highlight ? 'text-red-600' : ''}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Info adicional ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-sm mb-6 p-4 border border-border rounded-lg">
        <div><span className="text-muted-foreground">Otorgado:</span> {formatDate(credito.fecha_otorgamiento)}</div>
        <div><span className="text-muted-foreground">Vence:</span>{' '}
          <span className={estado === 'vencido' ? 'text-red-600 font-medium' : ''}>
            {formatDate(credito.fecha_vencimiento)}
          </span>
        </div>
        {credito.tasa_mora_pct > 0 && (
          <div><span className="text-muted-foreground">Mora diaria:</span> {credito.tasa_mora_pct}%</div>
        )}
        {credito.aval_nombre && (
          <div><span className="text-muted-foreground">Aval:</span> {credito.aval_nombre}</div>
        )}
        {credito.otorgado_por && (
          <div><span className="text-muted-foreground">Otorgado por:</span> {credito.otorgado_por}</div>
        )}
        {credito.ticket && (
          <div>
            <span className="text-muted-foreground">Ticket:</span>{' '}
            <Link href={`/admin/tickets/${credito.ticket.id}`}
              className="text-brand-accent hover:underline font-mono">
              {credito.ticket.folio}
            </Link>
          </div>
        )}
        {credito.notas && (
          <div className="col-span-full"><span className="text-muted-foreground">Notas:</span> {credito.notas}</div>
        )}
      </div>

      {/* ── Historial de abonos ────────────────────────────────── */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Historial de abonos
      </h2>
      {credito.abonos.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg text-sm text-muted-foreground mb-6">
          Sin abonos registrados
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Fecha</th>
                <th className="px-4 py-2.5 text-right w-32">Monto</th>
                <th className="px-4 py-2.5 text-left w-36">Método</th>
                <th className="px-4 py-2.5 text-left">Referencia</th>
                <th className="px-4 py-2.5 text-left">Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {credito.abonos.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{formatDate(a.fecha)}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-green-700">
                    +{formatMXN(a.monto)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{METODO_LABEL[a.metodo_pago] ?? a.metodo_pago}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{a.referencia ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.registrado_por ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-brand-surface font-semibold">
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {credito.abonos.length} pago{credito.abonos.length !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-green-700">
                  +{formatMXN(totalAbonado)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      )}

      {/* ── Pagaré ─────────────────────────────────────────────── */}
      {credito.ticket && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pagaré
            </h2>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Printer size={14} />
              Imprimir
            </button>
          </div>

          <div id="pagare-block" className="border-2 border-border rounded-lg p-6 print:border-black print:shadow-none bg-white">
            {/* Encabezado del pagaré */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold tracking-widest uppercase">PAGARÉ</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Folio de crédito: {credito.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{credito.lugar_expedicion}, {formatDate(credito.fecha_otorgamiento)}</p>
                <p className="text-muted-foreground text-xs mt-0.5">Ticket: {credito.ticket.folio}</p>
              </div>
            </div>

            {/* Monto en palabras */}
            <div className="border border-border rounded-lg p-4 mb-6 bg-brand-surface/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monto en letra</p>
              <p className="font-semibold text-sm leading-relaxed">
                {montoALetras(credito.monto_original)}
              </p>
              <p className="text-2xl font-bold mt-2">{formatMXN(credito.monto_original)}</p>
            </div>

            {/* Texto legal */}
            <div className="text-sm leading-relaxed mb-6 text-justify">
              <p>
                Yo, <strong>{credito.cliente.nombre}</strong>
                {credito.cliente.rfc ? `, con RFC <strong>${credito.cliente.rfc}</strong>,` : ','} me
                comprometo incondicionalmente a pagar a la orden de <strong>TINOCO</strong> la cantidad
                de <strong>{formatMXN(credito.monto_original)}</strong> ({montoALetras(credito.monto_original)}),
                el día <strong>{formatDate(credito.fecha_vencimiento)}</strong> en{' '}
                <strong>{credito.lugar_expedicion}</strong>, como contraprestación de los bienes
                detallados a continuación. Este pagaré causa intereses moratorios a razón del{' '}
                <strong>{credito.tasa_mora_pct > 0 ? `${credito.tasa_mora_pct}% diario` : '0%'}</strong>{' '}
                a partir de la fecha de vencimiento.
              </p>
              {credito.aval_nombre && (
                <p className="mt-2">
                  <strong>Aval:</strong> {credito.aval_nombre}
                </p>
              )}
            </div>

            {/* Productos */}
            {credito.ticket_items.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Relación de bienes / servicios
                </p>
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
                    {credito.ticket_items.map((item, i) => (
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
                      <td className="px-3 py-2 text-right font-mono">{formatMXN(credito.ticket.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Firmas */}
            <div className="grid grid-cols-2 gap-12 mt-10">
              <div className="text-center">
                <div className="border-t border-black pt-2 mt-12">
                  <p className="text-sm font-semibold">{credito.cliente.nombre}</p>
                  <p className="text-xs text-muted-foreground">DEUDOR</p>
                  {credito.cliente.rfc && (
                    <p className="text-xs text-muted-foreground font-mono">{credito.cliente.rfc}</p>
                  )}
                </div>
              </div>
              {credito.aval_nombre ? (
                <div className="text-center">
                  <div className="border-t border-black pt-2 mt-12">
                    <p className="text-sm font-semibold">{credito.aval_nombre}</p>
                    <p className="text-xs text-muted-foreground">AVAL / FIADOR</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="border-t border-black pt-2 mt-12">
                    <p className="text-sm font-semibold">TINOCO</p>
                    <p className="text-xs text-muted-foreground">ACREEDOR</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <AbonoDialog
        open={abonoOpen}
        onClose={() => setAbonoOpen(false)}
        creditoId={credito.id}
        saldoActual={saldo}
      />
    </>
  )
}
