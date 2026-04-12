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

  return (
    <ShellClient profile={{ nombre: profile.nombre, rol: profile.rol as UserRole, email: profile.email }}>
      {children}
    </ShellClient>
  )
}
