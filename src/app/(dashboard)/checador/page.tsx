import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketCard } from '@/components/tickets/TicketCard'

export const metadata = { title: 'Verificación — POS TINOCO' }

export default async function ChecadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (data as any)?.rol
  if (!rol || !['admin', 'checador', 'cajero'].includes(rol)) redirect('/')

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at, clientes(nombre)')
    .in('estado', ['aprobado', 'en_verificacion'])
    .order('created_at', { ascending: true })

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
      <h1 className="text-2xl font-heading font-semibold mb-2">Cola de Verificación</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {ticketsList.length} pedido{ticketsList.length !== 1 ? 's' : ''} por verificar
      </p>

      {ticketsList.length > 0 ? (
        <div className="space-y-3">
          {ticketsList.map((t) => (
            <TicketCard key={t.id} ticket={t} href={`/checador/verificar/${t.id}`} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Cola vacía</p>
        </div>
      )}
    </div>
  )
}
