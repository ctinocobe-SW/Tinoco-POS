import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { TicketCard } from '@/components/tickets/TicketCard'
import { TicketsRealtimeRefresh } from '@/components/tickets/TicketsRealtimeRefresh'
import { OfflineTicketsList } from '@/components/tickets/OfflineTicketsList'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Mis Tickets — POS TINOCO' }

export default async function TicketsPage() {
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

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at, clientes(nombre)')
    .eq('despachador_id', user.id)
    .order('created_at', { ascending: false })

  const ticketsList = (tickets ?? []).map((t: any) => ({
    id: t.id,
    folio: t.folio,
    estado: t.estado,
    total: t.total,
    created_at: t.created_at,
    cliente_nombre: t.clientes?.nombre,
  }))

  return (
    <div>
      <TicketsRealtimeRefresh despachadorId={user.id} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-semibold">Mis Tickets</h1>
        <Link href="/despachador/tickets/nuevo">
          <Button>
            <Plus size={16} className="mr-1.5" />
            Nuevo Ticket
          </Button>
        </Link>
      </div>

      <OfflineTicketsList />

      {ticketsList.length > 0 ? (
        <div className="space-y-3">
          {ticketsList.map((t) => (
            <TicketCard key={t.id} ticket={t} href={`/despachador/tickets/${t.id}`} context="despachador" />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No tienes tickets aún</p>
          <Link href="/despachador/tickets/nuevo" className="text-brand-accent underline text-sm mt-2 inline-block">
            Crea tu primer ticket
          </Link>
        </div>
      )}
    </div>
  )
}
