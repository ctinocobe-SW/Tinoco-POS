import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShellClient } from '@/components/layout/ShellClient'
import type { UserRole } from '@/types/database.types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('id, nombre, email, rol, activo')
    .eq('id', user.id)
    .single()

  const profile = data as any
  if (!profile || !profile.activo) redirect('/login')

  // Badges para admin: créditos vencidos y recepciones pendientes de cierre
  let creditosVencidos = 0
  let recepcionesPendientes = 0
  if (profile.rol === 'admin') {
    const [creditos, recepciones] = await Promise.all([
      supabase
        .from('creditos')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'vencido')
        .gt('saldo', 0),
      supabase
        .from('recepciones')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['recibida', 'con_discrepancias']),
    ])
    creditosVencidos = creditos.count ?? 0
    recepcionesPendientes = recepciones.count ?? 0
  }

  return (
    <ShellClient
      profile={{ nombre: profile.nombre, rol: profile.rol as UserRole, email: profile.email }}
      badges={{ creditosVencidos, recepcionesPendientes }}
    >
      {children}
    </ShellClient>
  )
}
