import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge'
import { TicketItemsTable } from '@/components/tickets/TicketItemsTable'
import { ApprovalActions } from '@/components/tickets/ApprovalActions'
import { formatMXN, formatDateTime } from '@/lib/utils/format'

export const metadata = { title: 'Detalle Ticket — POS TINOCO' }

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, folio, estado, subtotal, iva, ieps, descuento, total, notas, motivo_rechazo, created_at, clientes(nombre, rfc), profiles!tickets_despachador_id_fkey(nombre)')
    .eq('id', params.id)
    .single()

  if (!ticket) notFound()

  const t = ticket as any

  const { data: items } = await supabase
    .from('ticket_items')
    .select('id, cantidad, precio_unitario, descuento, subtotal, verificado, discrepancia_tipo, productos(sku, nombre)')
    .eq('ticket_id', params.id)

  const itemsList = (items ?? []).map((i: any) => ({
    id: i.id,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    descuento: i.descuento,
    subtotal: i.subtotal,
    verificado: i.verificado,
    discrepancia_tipo: i.discrepancia_tipo,
    producto_sku: i.productos?.sku,
    producto_nombre: i.productos?.nombre,
  }))

  return (
    <div className="max-w-3xl">
      <Link href="/admin/tickets" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={14} />
        Volver a la cola
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">{t.folio}</h1>
          <p className="text-sm text-muted-foreground">{formatDateTime(t.created_at)}</p>
        </div>
        <TicketStatusBadge estado={t.estado} />
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
          <p className="font-medium">{t.clientes?.nombre}</p>
          {t.clientes?.rfc && <p className="text-sm text-muted-foreground">{t.clientes.rfc}</p>}
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Despachador</p>
          <p className="font-medium">{t.profiles?.nombre}</p>
        </div>
      </div>

      {/* Items */}
      <div className="border border-border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">Productos ({itemsList.length})</h2>
        <TicketItemsTable items={itemsList} />

        {/* Totales */}
        <div className="flex justify-end mt-4 pt-4 border-t border-border">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMXN(Number(t.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span>{formatMXN(Number(t.iva))}</span>
            </div>
            {Number(t.ieps) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IEPS</span>
                <span>{formatMXN(Number(t.ieps))}</span>
              </div>
            )}
            {Number(t.descuento) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descuento</span>
                <span>-{formatMXN(Number(t.descuento))}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-border pt-1">
              <span>Total</span>
              <span>{formatMXN(Number(t.total))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notas */}
      {t.notas && (
        <div className="border border-border rounded-lg p-4 mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
          <p className="text-sm">{t.notas}</p>
        </div>
      )}

      {/* Motivo de rechazo */}
      {t.motivo_rechazo && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 mb-6">
          <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Motivo de rechazo</p>
          <p className="text-sm">{t.motivo_rechazo}</p>
        </div>
      )}

      {/* Acciones */}
      {t.estado === 'pendiente_aprobacion' && (
        <div className="border-t border-border pt-6">
          <ApprovalActions ticketId={t.id} />
        </div>
      )}
    </div>
  )
}
