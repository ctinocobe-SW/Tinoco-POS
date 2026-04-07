import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge'
import { VerificationChecklist } from '@/components/tickets/VerificationChecklist'
import { formatMXN, formatDateTime } from '@/lib/utils/format'

export const metadata = { title: 'Verificar Ticket — POS TINOCO' }

export default async function VerificarTicketPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (profile as any)?.rol
  if (!rol || !['admin', 'checador'].includes(rol)) redirect('/')

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at, clientes(nombre)')
    .eq('id', params.id)
    .single()

  if (!ticket) notFound()

  const t = ticket as any

  if (!['aprobado', 'en_verificacion'].includes(t.estado)) {
    redirect('/checador')
  }

  const { data: items } = await supabase
    .from('ticket_items')
    .select('id, cantidad, precio_unitario, subtotal, verificado, discrepancia_tipo, discrepancia_nota, productos(sku, nombre)')
    .eq('ticket_id', params.id)

  const itemsList = (items ?? []).map((i: any) => ({
    id: i.id,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: i.subtotal,
    verificado: i.verificado,
    discrepancia_tipo: i.discrepancia_tipo,
    discrepancia_nota: i.discrepancia_nota,
    producto_nombre: i.productos?.nombre ?? '—',
    producto_sku: i.productos?.sku ?? '—',
  }))

  return (
    <div className="max-w-2xl">
      <Link href="/checador" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={14} />
        Volver a la cola
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">{t.folio}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clientes?.nombre} · {formatDateTime(t.created_at)} · {formatMXN(Number(t.total))}
          </p>
        </div>
        <TicketStatusBadge estado={t.estado} />
      </div>

      <VerificationChecklist ticketId={t.id} items={itemsList} />
    </div>
  )
}
