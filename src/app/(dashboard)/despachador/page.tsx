import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { TicketCard } from '@/components/tickets/TicketCard'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Despacho — POS TINOCO' }

export default async function DespachadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (data as any)?.rol
  if (!rol || !['admin', 'despachador'].includes(rol)) redirect('/')

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at, clientes(nombre)')
    .eq('despachador_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const ticketsList = (tickets ?? []).map((t: any) => ({
    id: t.id,
    folio: t.folio,
    estado: t.estado,
    total: t.total,
    created_at: t.created_at,
    cliente_nombre: t.clientes?.nombre,
  }))

  const pendientes = ticketsList.filter((t) => t.estado === 'pendiente_aprobacion').length
  const aprobados = ticketsList.filter((t) => t.estado === 'aprobado').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-semibold">Despacho</h1>
        <Link href="/despachador/tickets/nuevo">
          <Button>
            <Plus size={16} className="mr-1.5" />
            Nuevo Ticket
          </Button>
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-semibold">{pendientes}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Aprobados</p>
          <p className="text-2xl font-semibold">{aprobados}</p>
        </div>
      </div>

      {/* Tickets recientes */}
      <h2 className="text-lg font-medium mb-3">Tickets recientes</h2>
      {ticketsList.length > 0 ? (
        <div className="space-y-3">
          {ticketsList.map((t) => (
            <TicketCard key={t.id} ticket={t} href={`/despachador/tickets/${t.id}`} context="despachador" />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Sin tickets aún</p>
      )}

      <Link href="/despachador/tickets" className="text-sm text-brand-accent underline mt-4 inline-block">
        Ver todos los tickets
      </Link>
    </div>
  )
}
