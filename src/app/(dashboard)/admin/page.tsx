import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Dashboard Admin — POS TINOCO' }

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

  const { count: ticketsVerificacion } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .in('estado', ['aprobado', 'en_verificacion'])

  return (
    <div>
      <h1 className="text-2xl font-heading font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link href="/admin/tickets" className="border border-border rounded-lg p-4 hover:bg-brand-surface transition-colors">
          <p className="text-sm text-muted-foreground">Pendientes de aprobación</p>
          <p className="text-3xl font-semibold mt-1">{ticketsPendientes ?? 0}</p>
        </Link>
        <div className="border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">En verificación</p>
          <p className="text-3xl font-semibold mt-1">{ticketsVerificacion ?? 0}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Tickets hoy</p>
          <p className="text-3xl font-semibold mt-1">{ticketsHoy ?? 0}</p>
        </div>
      </div>
    </div>
  )
}
