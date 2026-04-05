import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Dashboard Admin' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (data as any)?.rol
  if (rol !== 'admin') redirect('/')

  const { count: ticketsPendientes } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente_aprobacion')

  const { count: ticketsHoy } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date().toISOString().split('T')[0])

  return (
    <div>
      <h1>Dashboard Admin</h1>
      <p>Tickets pendientes: {ticketsPendientes ?? 0}</p>
      <p>Tickets hoy: {ticketsHoy ?? 0}</p>
    </div>
  )
}
