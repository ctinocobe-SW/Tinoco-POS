import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold" style={{ color: '#C9A84C' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>
          Resumen operativo del día
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Tickets pendientes" value={ticketsPendientes ?? 0} accent />
        <KpiCard label="Tickets hoy" value={ticketsHoy ?? 0} />
        <KpiCard label="Módulo analítica" value="Fase 6" muted />
        <KpiCard label="Inventario" value="Fase 2" muted />
      </div>

      <div className="rounded-lg p-8 text-center" style={{ border: '1px solid #3A3A50', background: '#2A2A3E' }}>
        <p className="font-heading text-lg" style={{ color: '#888' }}>
          Dashboard analítico completo disponible en Fase 6
        </p>
      </div>
    </div>
  )
}

function KpiCard({ label, value, accent, muted }: {
  label: string
  value: string | number
  accent?: boolean
  muted?: boolean
}) {
  const color = accent ? '#
