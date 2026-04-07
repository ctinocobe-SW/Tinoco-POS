import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketForm } from '@/components/tickets/TicketForm'

export const metadata = { title: 'Nuevo Ticket — POS TINOCO' }

export default async function NuevoTicketPage() {
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

  return (
    <div>
      <h1 className="text-2xl font-heading font-semibold mb-6">Nuevo Ticket</h1>
      <TicketForm />
    </div>
  )
}
