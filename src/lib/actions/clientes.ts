'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { clienteSchema } from '@/lib/validations/schemas'
import type { ClienteInput } from '@/lib/validations/schemas'

export async function crearCliente(input: ClienteInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden crear clientes' }
  }

  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert({
      id: crypto.randomUUID(),
      ...parsed.data,
    })
    .select('id')
    .single()

  if (error || !cliente) {
    return { error: error?.message ?? 'Error al crear el cliente' }
  }

  revalidatePath('/admin/clientes')

  return { data: { id: (cliente as any).id } }
}

export async function actualizarCliente(id: string, input: Partial<ClienteInput>) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden editar clientes' }
  }

  const parsed = clienteSchema.partial().safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('clientes')
    .update(parsed.data)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${id}`)

  return { data: { id } }
}

export async function toggleCliente(id: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden modificar clientes' }
  }

  const { data: cliente, error: fetchError } = await supabase
    .from('clientes')
    .select('activo')
    .eq('id', id)
    .single()

  if (fetchError || !cliente) {
    return { error: 'Cliente no encontrado' }
  }

  const { error } = await supabase
    .from('clientes')
    .update({ activo: !(cliente as any).activo })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${id}`)

  return { data: { activo: !(cliente as any).activo } }
}
