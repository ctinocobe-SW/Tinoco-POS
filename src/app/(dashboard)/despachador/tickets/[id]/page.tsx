import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SurtidoChecklist } from '@/components/tickets/SurtidoChecklist'
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge'
import { PackageCheck, ClipboardCheck } from 'lucide-react'
import { formatMXN, formatDate } from '@/lib/utils/format'
import type { TicketEstado } from '@/types/database.types'

export const metadata = { title: 'Surtido — POS TINOCO' }

export default async function TicketSurtidoPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (profile as any)?.rol
  if (!rol || !['admin', 'despachador'].includes(rol)) redirect('/')

  // Cargar ticket — solo el del despachador actual (o admin puede ver cualquiera)
  const query = supabase
    .from('tickets')
    .select('id, folio, estado, total, notas, created_at, clientes(nombre)')
    .eq('id', params.id)

  if (rol === 'despachador') {
    query.eq('despachador_id', user.id)
  }

  const { data: ticket } = await query.single()
  if (!ticket) notFound()

  // Cargar items con nombre y SKU del producto
  const { data: items } = await supabase
    .from('ticket_items')
    .select('id, cantidad, precio_unitario, subtotal, productos(sku, nombre)')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true })

  const itemsList = (items ?? []).map((i: any) => ({
    id: i.id as string,
    cantidad: Number(i.cantidad),
    precio_unitario: Number(i.precio_unitario),
    subtotal: Number(i.subtotal),
    producto_sku: i.productos?.sku as string ?? '—',
    producto_nombre: i.productos?.nombre as string ?? '—',
  }))

  const t = ticket as any

  return (
    <div className="max-w-lg mx-auto">
      {/* Back */}
      <Link
        href="/despachador/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5"
      >
        <ArrowLeft size={14} />
        Mis tickets
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-heading font-semibold">{t.folio}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.clientes?.nombre ?? '—'} · {formatDate(t.created_at)}
          </p>
        </div>
        <TicketStatusBadge estado={t.estado as TicketEstado} context="despachador" />
      </div>

      <p className="text-sm font-medium mb-1">{formatMXN(Number(t.total))}</p>
      {t.notas && (
        <p className="text-xs text-muted-foreground italic mb-4">"{t.notas}"</p>
      )}

      <div className="border-t border-border my-4" />

      {/* Banner para tickets ya enviados a verificación */}
      {t.estado === 'en_verificacion' && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-700">
          <PackageCheck size={18} className="flex-shrink-0" />
          <span>Este pedido ya fue enviado al checador para verificación.</span>
        </div>
      )}
      {(t.estado === 'verificado' || t.estado === 'con_incidencias') && (
        <div className={`flex items-center gap-3 rounded-lg p-4 mb-4 text-sm border ${
          t.estado === 'verificado'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <ClipboardCheck size={18} className="flex-shrink-0" />
          <span>
            {t.estado === 'verificado'
              ? 'Pedido verificado. Listo para entrega.'
              : 'Pedido verificado con incidencias. Revisa con el checador.'}
          </span>
        </div>
      )}

      {/* Checklist — solo activo cuando el ticket está aprobado */}
      {itemsList.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Este ticket no tiene productos.</p>
      ) : (
        <SurtidoChecklist ticketId={params.id} items={itemsList} estado={t.estado as TicketEstado} />
      )}
    </div>
  )
}
