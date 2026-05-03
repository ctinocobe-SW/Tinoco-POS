import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge'
import { TicketItemsTable } from '@/components/tickets/TicketItemsTable'
import { TicketItemsEditor } from '@/components/tickets/TicketItemsEditor'
import { PagareTicketBlock } from '@/components/creditos/PagareTicketBlock'
import { FacturarButton } from '@/components/tickets/FacturarButton'
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
    .select('id, folio, estado, subtotal, iva, ieps, descuento, total, notas, motivo_rechazo, created_at, es_credito, credito_id, facturado, cfdi_uuid, clientes(nombre, rfc, telefono), profiles!tickets_despachador_fk(nombre)')
    .eq('id', params.id)
    .single()

  if (!ticket) notFound()

  const t = ticket as any

  const { data: items } = await supabase
    .from('ticket_items')
    .select('id, producto_id, cantidad, precio_unitario, descuento, subtotal, unidad, verificado, discrepancia_tipo, productos(sku, nombre, precio_base, precio_mayoreo, unidad_precio_base, unidad_precio_mayoreo)')
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

  const editorItems = (items ?? []).map((i: any) => ({
    id: i.id,
    producto_id: i.producto_id,
    cantidad: Number(i.cantidad),
    precio_unitario: Number(i.precio_unitario),
    descuento: Number(i.descuento),
    unidad: i.unidad ?? null,
    producto_sku: i.productos?.sku ?? '—',
    producto_nombre: i.productos?.nombre ?? '—',
    precio_base: Number(i.productos?.precio_base) || 0,
    precio_mayoreo: Number(i.productos?.precio_mayoreo) || 0,
    unidad_precio_base: i.productos?.unidad_precio_base ?? null,
    unidad_precio_mayoreo: i.productos?.unidad_precio_mayoreo ?? null,
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
        <div className="flex items-center gap-3">
          {['despachado', 'facturado', 'cerrado'].includes(t.estado) && (
            <FacturarButton
              ticketId={t.id}
              facturado={t.facturado ?? false}
              cfdiUuid={t.cfdi_uuid ?? null}
            />
          )}
          <TicketStatusBadge estado={t.estado} />
        </div>
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

        {t.estado === 'pendiente_aprobacion' ? (
          <TicketItemsEditor ticketId={t.id} initialItems={editorItems} />
        ) : (
          <>
            <TicketItemsTable items={itemsList} />
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
          </>
        )}
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

      {/* Pagaré — visible cuando el ticket tiene crédito vinculado */}
      {t.es_credito && t.credito_id && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={15} className="text-brand-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pagaré vinculado
            </h2>
            <Link href={`/admin/creditos/${t.credito_id}`}
              className="ml-auto text-xs text-brand-accent hover:underline">
              Ver crédito →
            </Link>
          </div>
          <PagareTicketBlock
            ticket={{
              folio: t.folio,
              total: Number(t.total),
              created_at: t.created_at,
            }}
            cliente={{
              nombre: t.clientes?.nombre ?? '—',
              rfc: t.clientes?.rfc ?? null,
            }}
            creditoId={t.credito_id}
            items={itemsList.map((i) => ({
              cantidad: Number(i.cantidad),
              precio_unitario: Number(i.precio_unitario),
              subtotal: Number(i.subtotal),
              producto_sku: i.producto_sku ?? '—',
              producto_nombre: i.producto_nombre ?? '—',
            }))}
          />
        </div>
      )}
    </div>
  )
}
