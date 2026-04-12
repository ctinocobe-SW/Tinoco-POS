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

  // Badge de créditos vencidos solo para admin
  let creditosVencidos = 0
  if (profile.rol === 'admin') {
    const { count } = await supabase
      .from('creditos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'vencido')
      .gt('saldo', 0)
    creditosVencidos = count ?? 0
  }

  return (
    <ShellClient
      profile={{ nombre: profile.nombre, rol: profile.rol as UserRole, email: profile.email }}
      badges={{ creditosVencidos }}
    >
      {children}
    </ShellClient>
  )
}
