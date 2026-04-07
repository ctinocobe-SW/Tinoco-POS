'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database.types'

export async function getAuthenticatedProfile() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('No autenticado')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, nombre, email, rol, almacen_id, activo')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Perfil no encontrado')
  }

  if (!(profile as any).activo) {
    throw new Error('Usuario inactivo')
  }

  return {
    user,
    profile: profile as {
      id: string
      nombre: string
      email: string
      rol: UserRole
      almacen_id: string | null
      activo: boolean
    },
    supabase,
  }
}
