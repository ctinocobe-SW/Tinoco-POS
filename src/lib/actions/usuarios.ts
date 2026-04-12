'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export type UsuarioRol = 'admin' | 'despachador' | 'checador' | 'cajero'

export async function crearUsuario(input: {
  nombre: string
  email: string
  password: string
  rol: UsuarioRol
}) {
  const { profile } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Solo administradores pueden crear usuarios' }

  const { nombre, email, password, rol } = input
  if (!nombre.trim()) return { error: 'El nombre es requerido' }
  if (!email.trim()) return { error: 'El email es requerido' }
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres' }

  const admin = createAdminClient()

  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Error al crear el usuario' }
  }

  const userId = authData.user.id

  // Insertar perfil
  const { error: profileError } = await admin
    .from('profiles')
    .insert({
      id: userId,
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      rol,
      activo: true,
    })

  if (profileError) {
    // Revertir creación del auth user
    await admin.auth.admin.deleteUser(userId)
    return { error: profileError.message }
  }

  revalidatePath('/admin/configuracion')
  return { data: { id: userId } }
}

export async function actualizarUsuario(userId: string, input: {
  nombre: string
  rol: UsuarioRol
  password?: string
}) {
  const { profile } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Solo administradores pueden editar usuarios' }

  const { nombre, rol, password } = input
  if (!nombre.trim()) return { error: 'El nombre es requerido' }

  const admin = createAdminClient()

  // Actualizar perfil
  const { error: profileError } = await admin
    .from('profiles')
    .update({ nombre: nombre.trim(), rol })
    .eq('id', userId)

  if (profileError) return { error: profileError.message }

  // Cambiar contraseña si se proporcionó
  if (password && password.length > 0) {
    if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres' }
    const { error: passError } = await admin.auth.admin.updateUserById(userId, { password })
    if (passError) return { error: passError.message }
  }

  revalidatePath('/admin/configuracion')
  return { data: { ok: true } }
}

export async function toggleUsuarioActivo(userId: string, activo: boolean) {
  const { profile } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }
  if (userId === profile.id) return { error: 'No puedes desactivar tu propia cuenta' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ activo })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/configuracion')
  return { data: { activo } }
}
