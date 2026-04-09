'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'

export async function crearListaAlmacen(input: {
  nombre: string
  notas?: string
  items: { producto_id: string; cantidad: number; notas?: string }[]
}) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Sin permisos para crear listas de almacén' }
  }

  if (!input.nombre.trim()) return { error: 'El nombre es requerido' }
  if (input.items.length === 0) return { error: 'Agrega al menos un producto' }

  const listaId = crypto.randomUUID()

  const { error: listaError } = await supabase
    .from('listas_almacen')
    .insert({
      id: listaId,
      nombre: input.nombre.trim(),
      notas: input.notas || null,
      estado: 'borrador',
      creado_por: profile.id,
    })

  if (listaError) return { error: listaError.message }

  const { error: itemsError } = await supabase
    .from('lista_almacen_items')
    .insert(
      input.items.map((item) => ({
        id: crypto.randomUUID(),
        lista_id: listaId,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        notas: item.notas || null,
      }))
    )

  if (itemsError) return { error: itemsError.message }

  revalidatePath('/despachador/surtido')
  revalidatePath('/admin/surtido')

  return { data: { id: listaId } }
}

export async function finalizarListaAlmacen(listaId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Sin permisos' }
  }

  const { error } = await supabase
    .from('listas_almacen')
    .update({ estado: 'finalizada' })
    .eq('id', listaId)

  if (error) return { error: error.message }

  revalidatePath('/despachador/surtido')
  revalidatePath('/admin/surtido')

  return { data: { ok: true } }
}
