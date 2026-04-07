'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { productoSchema } from '@/lib/validations/schemas'
import type { ProductoInput } from '@/lib/validations/schemas'

export async function crearProducto(input: ProductoInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden crear productos' }
  }

  const parsed = productoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { data: existing } = await supabase
    .from('productos')
    .select('id')
    .eq('sku', parsed.data.sku)
    .single()

  if (existing) {
    return { error: `El SKU "${parsed.data.sku}" ya está en uso` }
  }

  const { data: producto, error } = await supabase
    .from('productos')
    .insert({
      id: crypto.randomUUID(),
      ...parsed.data,
    })
    .select('id')
    .single()

  if (error || !producto) {
    return { error: error?.message ?? 'Error al crear el producto' }
  }

  revalidatePath('/admin/productos')

  return { data: { id: (producto as any).id } }
}

export async function actualizarProducto(id: string, input: Partial<ProductoInput>) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden editar productos' }
  }

  const parsed = productoSchema.partial().safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  if (parsed.data.sku) {
    const { data: existing } = await supabase
      .from('productos')
      .select('id')
      .eq('sku', parsed.data.sku)
      .neq('id', id)
      .single()

    if (existing) {
      return { error: `El SKU "${parsed.data.sku}" ya está en uso` }
    }
  }

  const { error } = await supabase
    .from('productos')
    .update(parsed.data)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/productos')
  revalidatePath(`/admin/productos/${id}`)

  return { data: { id } }
}

export async function toggleProducto(id: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden modificar productos' }
  }

  const { data: producto, error: fetchError } = await supabase
    .from('productos')
    .select('activo')
    .eq('id', id)
    .single()

  if (fetchError || !producto) {
    return { error: 'Producto no encontrado' }
  }

  const { error } = await supabase
    .from('productos')
    .update({ activo: !(producto as any).activo })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/productos')
  revalidatePath(`/admin/productos/${id}`)

  return { data: { activo: !(producto as any).activo } }
}
