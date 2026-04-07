'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { crearRecepcionSchema } from '@/lib/validations/schemas'
import type { CrearRecepcionInput } from '@/lib/validations/schemas'

export async function crearRecepcion(input: CrearRecepcionInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Sin permisos para registrar recepciones' }
  }

  const parsed = crearRecepcionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { proveedor_id, almacen_id, fecha, notas, items } = parsed.data

  const { data: recepcion, error: recepcionError } = await supabase
    .from('recepciones')
    .insert({
      id: crypto.randomUUID(),
      proveedor_id: proveedor_id ?? null,
      despachador_id: profile.id,
      almacen_id,
      fecha: fecha ?? new Date().toISOString().split('T')[0],
      notas: notas ?? null,
      confirmado: false,
    })
    .select('id')
    .single()

  if (recepcionError || !recepcion) {
    return { error: recepcionError?.message ?? 'Error al crear la recepción' }
  }

  const recepcionId = (recepcion as any).id

  const recepcionItems = items.map((item) => ({
    id: crypto.randomUUID(),
    recepcion_id: recepcionId,
    producto_id: item.producto_id,
    cantidad_esperada: item.cantidad_esperada ?? null,
    cantidad_recibida: item.cantidad_recibida,
    fecha_caducidad: item.fecha_caducidad ?? null,
    discrepancia: item.discrepancia ?? null,
  }))

  const { error: itemsError } = await supabase
    .from('recepcion_items')
    .insert(recepcionItems)

  if (itemsError) {
    return { error: 'Error al guardar los productos de la recepción' }
  }

  revalidatePath('/despachador/recepciones')
  revalidatePath('/admin/inventario')

  return { data: { id: recepcionId } }
}

export async function confirmarRecepcion(recepcionId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Sin permisos para confirmar recepciones' }
  }

  // Verificar estado actual
  const { data: recepcion, error: fetchError } = await supabase
    .from('recepciones')
    .select('id, confirmado, almacen_id')
    .eq('id', recepcionId)
    .single()

  if (fetchError || !recepcion) {
    return { error: 'Recepción no encontrada' }
  }

  if ((recepcion as any).confirmado) {
    return { error: 'Esta recepción ya fue confirmada' }
  }

  const almacenId = (recepcion as any).almacen_id

  // Obtener items
  const { data: items, error: itemsError } = await supabase
    .from('recepcion_items')
    .select('id, producto_id, cantidad_recibida')
    .eq('recepcion_id', recepcionId)

  if (itemsError || !items || items.length === 0) {
    return { error: 'No hay productos en esta recepción' }
  }

  // Para cada item: registrar movimiento + actualizar inventario
  for (const item of items as any[]) {
    // Insertar movimiento de inventario
    const { error: movError } = await supabase
      .from('movimientos_inventario')
      .insert({
        id: crypto.randomUUID(),
        producto_id: item.producto_id,
        almacen_id: almacenId,
        tipo: 'entrada',
        cantidad: item.cantidad_recibida,
        referencia_tipo: 'recepcion',
        referencia_id: recepcionId,
        usuario_id: profile.id,
        notas: null,
      })

    if (movError) {
      return { error: `Error al registrar movimiento: ${movError.message}` }
    }

    // Upsert inventario: buscar si existe el registro
    const { data: invExistente } = await supabase
      .from('inventario')
      .select('id, stock_actual')
      .eq('producto_id', item.producto_id)
      .eq('almacen_id', almacenId)
      .single()

    if (invExistente) {
      // Incrementar stock existente
      const { error: invError } = await supabase
        .from('inventario')
        .update({
          stock_actual: Number((invExistente as any).stock_actual) + Number(item.cantidad_recibida),
        })
        .eq('id', (invExistente as any).id)

      if (invError) {
        return { error: `Error al actualizar inventario: ${invError.message}` }
      }
    } else {
      // Crear registro de inventario
      const { error: invError } = await supabase
        .from('inventario')
        .insert({
          id: crypto.randomUUID(),
          producto_id: item.producto_id,
          almacen_id: almacenId,
          stock_actual: Number(item.cantidad_recibida),
          stock_minimo: 0,
        })

      if (invError) {
        return { error: `Error al crear inventario: ${invError.message}` }
      }
    }
  }

  // Marcar recepción como confirmada
  const { error: updateError } = await supabase
    .from('recepciones')
    .update({
      confirmado: true,
      confirmado_at: new Date().toISOString(),
    })
    .eq('id', recepcionId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/despachador/recepciones')
  revalidatePath(`/despachador/recepciones/${recepcionId}`)
  revalidatePath('/admin/inventario')

  return { data: { confirmado: true } }
}
