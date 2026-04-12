'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'

function revalidateAll() {
  revalidatePath('/despachador/surtido')
  revalidatePath('/admin/surtido')
  revalidatePath('/checador/surtido')
}

export async function crearListaAlmacen(input: {
  nombre: string
  notas?: string
  almacen_id?: string
  items: { producto_id: string; cantidad: number; notas?: string }[]
}) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Solo admin o despachador pueden crear listas' }
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
      almacen_id: input.almacen_id || null,
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

  revalidateAll()
  return { data: { id: listaId } }
}

export async function finalizarListaAlmacen(listaId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Solo admin o checador pueden finalizar listas' }
  }

  const { error } = await supabase
    .from('listas_almacen')
    .update({ estado: 'finalizada' })
    .eq('id', listaId)

  if (error) return { error: error.message }

  revalidateAll()
  return { data: { ok: true } }
}

export async function toggleItemChecado(itemId: string, checado: boolean) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Solo admin o checador pueden verificar ítems' }
  }

  const { error } = await supabase
    .from('lista_almacen_items')
    .update({
      checado,
      checado_at: checado ? new Date().toISOString() : null,
      checado_por: checado ? profile.id : null,
    })
    .eq('id', itemId)

  if (error) return { error: error.message }

  return { data: { ok: true } }
}
