import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Dashboard Admin — POS TINOCO' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'admin') redirect('/')

  // KPIs rápidos
  const [{ count: ticketsPendientes }, { count: ticketsHoy }] = await Promise.all([
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente_aprobacion'),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-brand-gold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen operativo del día</p>
      </div>

      {/* KPI Cards — placeholder hasta Fase 6 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Tickets pendientes" value={ticketsPendientes ?? 0} accent />
        <KpiCard label="Tickets hoy" value={ticketsHoy ?? 0} />
        <KpiCard label="Módulo analítica" value="Fase 6" muted />
        <KpiCard label="Módulo analítica" value="Fase 6" muted />
      </div>

      <div className="rounded-lg border border-border bg-brand-surface p-8 text-center text-muted-foreground">
        <p className="font-heading text-lg">Dashboard analítico completo disponible en Fase 6</p>
        <p className="text-sm mt-1">Continúa en Claude Code con la Fase 1: Flujo Core de Ventas</p>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  accent = false,
  muted = false,
}: {
  label: string
  value: string | number
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-brand-surface p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <p className={`font-heading text-3xl font-semibold ${accent ? 'text-brand-gold' : muted ? 'text-muted-foreground' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  )
}
