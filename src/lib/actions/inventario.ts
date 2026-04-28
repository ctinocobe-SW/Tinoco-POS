'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { ajusteInventarioSchema } from '@/lib/validations/schemas'
import type { AjusteInventarioInput } from '@/lib/validations/schemas'

export async function registrarProductoEnAlmacen(producto_id: string, almacen_id: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo el administrador puede registrar inventario' }
  }

  if (!producto_id || !almacen_id) {
    return { error: 'Faltan datos requeridos' }
  }

  const { data: existing } = await supabase
    .from('inventario')
    .select('id')
    .eq('producto_id', producto_id)
    .eq('almacen_id', almacen_id)
    .maybeSingle()

  if (existing) {
    return { error: 'El producto ya está registrado en este almacén' }
  }

  const { error } = await supabase
    .from('inventario')
    .insert({
      id: crypto.randomUUID(),
      producto_id,
      almacen_id,
      stock_actual: 0,
      stock_minimo: 0,
    })

  if (error) return { error: error.message }

  revalidatePath('/admin/inventario')
  return { data: { ok: true } }
}

export async function ajustarInventario(input: AjusteInventarioInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo el administrador puede realizar ajustes de inventario' }
  }

  const parsed = ajusteInventarioSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { producto_id, almacen_id, tipo, cantidad, notas } = parsed.data

  // Registrar movimiento
  const { error: movError } = await supabase
    .from('movimientos_inventario')
    .insert({
      id: crypto.randomUUID(),
      producto_id,
      almacen_id,
      tipo,
      cantidad,
      referencia_tipo: 'ajuste_manual',
      referencia_id: null,
      usuario_id: profile.id,
      notas: notas ?? null,
    })

  if (movError) {
    return { error: `Error al registrar movimiento: ${movError.message}` }
  }

  // Actualizar stock en inventario
  const { data: inv } = await supabase
    .from('inventario')
    .select('id, stock_actual')
    .eq('producto_id', producto_id)
    .eq('almacen_id', almacen_id)
    .single()

  const delta = tipo === 'salida' || tipo === 'merma' ? -cantidad : cantidad

  if (inv) {
    const nuevoStock = Math.max(0, Number((inv as any).stock_actual) + delta)
    const { error: invError } = await supabase
      .from('inventario')
      .update({ stock_actual: nuevoStock })
      .eq('id', (inv as any).id)

    if (invError) {
      return { error: `Error al actualizar inventario: ${invError.message}` }
    }
  } else {
    // Si no existe registro (ajuste de entrada sin recepción previa)
    if (delta <= 0) {
      return { error: 'No existe inventario para este producto en este almacén' }
    }
    const { error: invError } = await supabase
      .from('inventario')
      .insert({
        id: crypto.randomUUID(),
        producto_id,
        almacen_id,
        stock_actual: cantidad,
        stock_minimo: 0,
      })

    if (invError) {
      return { error: `Error al crear inventario: ${invError.message}` }
    }
  }

  revalidatePath('/admin/inventario')

  return { data: { ok: true } }
}
