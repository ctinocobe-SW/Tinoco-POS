import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SurtidoChecklist } from '@/components/tickets/SurtidoChecklist'
import { MarcarListoButton } from '@/components/tickets/MarcarListoButton'
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge'
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
        <TicketStatusBadge estado={t.estado as TicketEstado} />
      </div>

      <p className="text-sm font-medium mb-1">{formatMXN(Number(t.total))}</p>
      {t.notas && (
        <p className="text-xs text-muted-foreground italic mb-4">"{t.notas}"</p>
      )}

      <div className="border-t border-border my-4" />

      {/* Checklist */}
      {itemsList.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Este ticket no tiene productos.</p>
      ) : (
        <SurtidoChecklist ticketId={params.id} items={itemsList} />
      )}

      {/* Botón para enviar a verificación — solo cuando el ticket está aprobado */}
      {t.estado === 'aprobado' && itemsList.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <MarcarListoButton ticketId={params.id} />
        </div>
      )}
    </div>
  )
}
