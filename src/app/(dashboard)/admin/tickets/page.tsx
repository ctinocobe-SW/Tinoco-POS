import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminTicketsDashboard } from '@/components/tickets/AdminTicketsDashboard'
import type { TicketEstado } from '@/types/database.types'

export const metadata = { title: 'Tickets — POS TINOCO' }

const ACTIVE_ESTADOS: TicketEstado[] = [
  'pendiente_aprobacion', 'aprobado', 'en_verificacion', 'verificado', 'con_incidencias', 'despachado'
]

export default async function AdminTicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  // Cargar tickets activos con joins
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, folio, estado, total, notas, created_at, aprobado_at, verificado_at, despachado_at, cobro_pendiente,
      clientes(nombre, rfc),
      despachador:profiles!tickets_despachador_id_fkey(nombre),
      checador:profiles!tickets_checador_id_fkey(nombre)
    `)
    .in('estado', ACTIVE_ESTADOS)
    .order('created_at', { ascending: false })
    .limit(200)

  const ticketsList = (tickets ?? []).map((t: any) => ({
    id: t.id as string,
    folio: t.folio as string,
    estado: t.estado as TicketEstado,
    total: Number(t.total),
    notas: t.notas as string | null,
    created_at: t.created_at as string,
    aprobado_at: t.aprobado_at as string | null,
    verificado_at: t.verificado_at as string | null,
    despachado_at: t.despachado_at as string | null,
    cobro_pendiente: (t.cobro_pendiente as boolean) ?? false,
    cliente_nombre: t.clientes?.nombre as string | null,
    cliente_rfc: t.clientes?.rfc as string | null,
    despachador_nombre: t.despachador?.nombre as string | null,
    checador_nombre: t.checador?.nombre as string | null,
  }))

  // Despachadores para el formulario de creación
  const { data: despachadores } = await supabase
    .from('profiles')
    .select('id, nombre, rol')
    .eq('rol', 'despachador')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  // Almacenes para el formulario
  const { data: almacenes } = await supabase
    .from('almacenes')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  return (
    <AdminTicketsDashboard
      tickets={ticketsList}
      despachadores={(despachadores ?? []) as { id: string; nombre: string; rol: string }[]}
      almacenes={(almacenes ?? []) as { id: string; nombre: string }[]}
    />
  )
}
