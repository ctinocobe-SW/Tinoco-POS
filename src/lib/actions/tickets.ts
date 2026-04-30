'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { crearTicketSchema, aprobarTicketSchema } from '@/lib/validations/schemas'
import type { CrearTicketInput } from '@/lib/validations/schemas'

function calcularItemsConPrecios(
  items: { producto_id: string; cantidad: number; precio_unitario: number; descuento: number; unidad?: string | null }[],
  productosMap: Map<string, any>,
  esAdmin: boolean,
): { itemsCalculados: any[]; subtotal: number; descuentoTotal: number } {
  let subtotal = 0
  let descuentoTotal = 0
  const itemsCalculados: any[] = []

  for (const item of items) {
    const prod = productosMap.get(item.producto_id)
    if (!prod) throw new Error(`Producto ${item.producto_id} no encontrado`)

    // Derivar precio según la unidad seleccionada
    let precio: number
    const base = Number(prod.precio_base) || 0
    const mayoreo = Number(prod.precio_mayoreo) || 0
    const unidadBase = prod.unidad_precio_base
    const unidadMayoreo = prod.unidad_precio_mayoreo

    if (item.unidad && item.unidad === unidadMayoreo && mayoreo > 0 && item.unidad !== unidadBase) {
      // Unidad es exclusivamente de mayoreo
      precio = mayoreo
    } else if (item.unidad && item.unidad === unidadBase && base > 0) {
      // Unidad es de menudeo (aunque también pueda ser mayoreo)
      precio = base
    } else if (item.unidad && item.unidad === unidadMayoreo && mayoreo > 0) {
      // Misma unidad para ambos — si el cliente envió precio explícito y es el de mayoreo, usar ese;
      // de lo contrario usar menudeo como default
      precio = base > 0 ? base : mayoreo
    } else if (base > 0) {
      precio = base
    } else {
      precio = mayoreo
    }

    // Solo el admin puede sobrescribir con precio explícito (ej. al editar antes de aprobar)
    if (esAdmin && item.precio_unitario > 0) precio = item.precio_unitario

    const lineSubtotal = precio * item.cantidad - item.descuento
    subtotal += lineSubtotal
    descuentoTotal += item.descuento

    itemsCalculados.push({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: precio,
      descuento: item.descuento,
      subtotal: lineSubtotal,
      unidad: item.unidad ?? null,
    })
  }

  return { itemsCalculados, subtotal, descuentoTotal }
}

export async function crearTicket(input: CrearTicketInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Sin permisos para crear tickets' }
  }

  const parsed = crearTicketSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { cliente_id, despachador_id: inputDespachadorId, almacen_id, items, notas } = parsed.data

  const isAdmin = profile.rol === 'admin'

  if (isAdmin) {
    if (!inputDespachadorId) {
      return { error: 'Debes asignar un despachador' }
    }
    const { data: target } = await supabase
      .from('profiles')
      .select('id, rol, activo')
      .eq('id', inputDespachadorId)
      .single()
    if (!target || (target as any).rol !== 'despachador' || !(target as any).activo) {
      return { error: 'El despachador seleccionado no es válido' }
    }
  }

  const despachadorId = isAdmin ? inputDespachadorId! : profile.id

  // Obtener precios reales de productos para evitar manipulación
  const productoIds = items.map((i) => i.producto_id)
  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('id, precio_base, precio_mayoreo, unidad_precio_base, unidad_precio_mayoreo')
    .in('id', productoIds)

  if (prodError || !productos) {
    return { error: 'Error al obtener productos' }
  }

  const productosMap = new Map(productos.map((p: any) => [p.id, p]))

  let calcResult: ReturnType<typeof calcularItemsConPrecios>
  try {
    calcResult = calcularItemsConPrecios(items, productosMap, isAdmin)
  } catch (e: any) {
    return { error: e.message ?? 'Error al calcular precios' }
  }
  const { itemsCalculados, subtotal, descuentoTotal } = calcResult

  const total = subtotal

  // Insertar ticket
  const insertPayload: Record<string, unknown> = {
    id: crypto.randomUUID(),
    cliente_id,
    despachador_id: despachadorId,
    almacen_id: almacen_id ?? profile.almacen_id,
    estado: isAdmin ? 'aprobado' : 'pendiente_aprobacion',
    subtotal,
    iva: 0,
    ieps: 0,
    descuento: descuentoTotal,
    total,
    notas: notas ?? null,
  }

  if (isAdmin) {
    insertPayload.aprobado_por = profile.id
    insertPayload.aprobado_at = new Date().toISOString()
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert(insertPayload)
    .select('id, folio')
    .single()

  if (ticketError || !ticket) {
    return { error: ticketError?.message ?? 'Error al crear ticket' }
  }

  // Insertar items
  const ticketItems = itemsCalculados.map((item) => ({
    id: crypto.randomUUID(),
    ticket_id: (ticket as any).id,
    ...item,
    verificado: false,
  }))

  const { error: itemsError } = await supabase
    .from('ticket_items')
    .insert(ticketItems)

  if (itemsError) {
    return { error: 'Error al guardar los items del ticket' }
  }

  revalidatePath('/despachador')
  revalidatePath('/despachador/tickets')
  revalidatePath('/admin/tickets')

  return { data: { id: (ticket as any).id, folio: (ticket as any).folio } }
}

export async function aprobarTicket(input: {
  ticket_id: string
  accion: 'aprobar' | 'rechazar' | 'devolver'
  motivo?: string
}) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden aprobar tickets' }
  }

  const parsed = aprobarTicketSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { ticket_id, accion, motivo } = parsed.data

  // Verificar estado actual
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('id, estado')
    .eq('id', ticket_id)
    .single()

  if (fetchError || !ticket) {
    return { error: 'Ticket no encontrado' }
  }

  if ((ticket as any).estado !== 'pendiente_aprobacion') {
    return { error: 'El ticket no está pendiente de aprobación' }
  }

  const estadoMap = {
    aprobar: 'aprobado',
    rechazar: 'rechazado',
    devolver: 'devuelto',
  } as const

  const updateData: Record<string, any> = {
    estado: estadoMap[accion],
  }

  if (accion === 'aprobar') {
    updateData.aprobado_por = profile.id
    updateData.aprobado_at = new Date().toISOString()
  }

  if (accion === 'rechazar' || accion === 'devolver') {
    updateData.motivo_rechazo = motivo ?? null
  }

  const { error: updateError } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', ticket_id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/admin/tickets')
  revalidatePath('/admin')
  revalidatePath('/despachador')
  revalidatePath('/despachador/tickets')
  revalidatePath('/checador')

  return { data: { estado: estadoMap[accion] } }
}

export async function marcarListoParaVerificacion(ticketId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Sin permisos' }
  }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, estado, despachador_id')
    .eq('id', ticketId)
    .single()

  if (!ticket) return { error: 'Ticket no encontrado' }

  // El despachador solo puede marcar sus propios tickets
  if (profile.rol === 'despachador' && (ticket as any).despachador_id !== profile.id) {
    return { error: 'No tienes permiso para modificar este ticket' }
  }

  if ((ticket as any).estado !== 'aprobado') {
    return { error: 'El ticket debe estar aprobado para marcarlo como listo' }
  }

  const { error } = await supabase
    .from('tickets')
    .update({ estado: 'en_verificacion' })
    .eq('id', ticketId)

  if (error) return { error: error.message }

  revalidatePath('/despachador/tickets')
  revalidatePath(`/despachador/tickets/${ticketId}`)
  revalidatePath('/checador')
  revalidatePath('/admin/tickets')

  return { data: { ok: true } }
}

export async function verificarItem(input: {
  ticket_item_id: string
  verificado: boolean
  discrepancia_tipo?: string | null
  discrepancia_nota?: string | null
}) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Sin permisos para verificar' }
  }

  const { ticket_item_id, verificado, discrepancia_tipo, discrepancia_nota } = input

  // Obtener el item y su ticket
  const { data: item, error: itemError } = await supabase
    .from('ticket_items')
    .select('id, ticket_id')
    .eq('id', ticket_item_id)
    .single()

  if (itemError || !item) {
    return { error: 'Item no encontrado' }
  }

  // Verificar que el ticket esté en_verificacion (el despachador ya lo marcó como listo)
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, estado')
    .eq('id', (item as any).ticket_id)
    .single()

  if (!ticket || (ticket as any).estado !== 'en_verificacion') {
    return { error: 'El ticket no está listo para verificación' }
  }

  // Asignar checador si no tiene uno
  await supabase
    .from('tickets')
    .update({ checador_id: profile.id })
    .eq('id', (item as any).ticket_id)
    .is('checador_id', null)

  // Actualizar el item
  const { error: updateError } = await supabase
    .from('ticket_items')
    .update({
      verificado,
      discrepancia_tipo: verificado ? null : (discrepancia_tipo ?? null),
      discrepancia_nota: verificado ? null : (discrepancia_nota ?? null),
    })
    .eq('id', ticket_item_id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/checador/verificar/${(item as any).ticket_id}`)

  return { data: { ok: true } }
}

export async function despacharTicket(ticketId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Sin permisos para despachar tickets' }
  }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, estado')
    .eq('id', ticketId)
    .single()

  if (!ticket) {
    return { error: 'Ticket no encontrado' }
  }

  if (!['verificado', 'con_incidencias'].includes((ticket as any).estado)) {
    return { error: 'El ticket debe estar verificado para poder despacharse' }
  }

  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      estado: 'despachado',
      despachado_at: new Date().toISOString(),
    })
    .eq('id', ticketId)

  if (updateError) {
    return { error: updateError.message }
  }

  // Descontar inventario en El Mercader (o el almacén del ticket)
  const { error: invError } = await supabase.rpc('descontar_inventario_ticket', {
    p_ticket_id: ticketId,
  })
  if (invError) {
    // No revertimos el despacho, solo avisamos
    console.error('Error al descontar inventario:', invError.message)
  }

  revalidatePath('/despachador/surtido')
  revalidatePath('/admin/surtido')
  revalidatePath('/admin/tickets')
  revalidatePath('/despachador/tickets')
  revalidatePath('/admin/inventario')

  return { data: { despachado: true } }
}

export async function finalizarVerificacion(ticketId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Sin permisos' }
  }

  // Verificar estado
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, estado')
    .eq('id', ticketId)
    .single()

  if (!ticket || (ticket as any).estado !== 'en_verificacion') {
    return { error: 'El ticket no está en verificación' }
  }

  // Verificar que todos los items hayan sido revisados
  const { data: items } = await supabase
    .from('ticket_items')
    .select('id, verificado, discrepancia_tipo')
    .eq('ticket_id', ticketId)

  if (!items || items.length === 0) {
    return { error: 'No hay items en el ticket' }
  }

  const sinRevisar = items.filter((i: any) => !i.verificado && !i.discrepancia_tipo)
  if (sinRevisar.length > 0) {
    return { error: `Faltan ${sinRevisar.length} items por revisar` }
  }

  const conIncidencias = items.some((i: any) => i.discrepancia_tipo)
  const nuevoEstado = conIncidencias ? 'con_incidencias' : 'verificado'

  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      estado: nuevoEstado,
      checador_id: profile.id,
      verificado_at: new Date().toISOString(),
    })
    .eq('id', ticketId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/checador')
  revalidatePath(`/checador/verificar/${ticketId}`)
  revalidatePath('/admin/tickets')

  return { data: { estado: nuevoEstado } }
}

const ESTADOS_CANCELABLES: string[] = [
  'aprobado', 'en_verificacion', 'verificado', 'con_incidencias', 'despachado'
]

export async function cancelarTicket(ticketId: string, motivo?: string): Promise<{ error?: string }> {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden cancelar tickets' }
  }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, estado')
    .eq('id', ticketId)
    .single()

  if (!ticket) return { error: 'Ticket no encontrado' }

  if (!ESTADOS_CANCELABLES.includes((ticket as any).estado)) {
    return { error: `No se puede cancelar un ticket en estado "${(ticket as any).estado}"` }
  }

  const { error } = await supabase
    .from('tickets')
    .update({ estado: 'cancelado', motivo_rechazo: motivo ?? null })
    .eq('id', ticketId)

  if (error) return { error: error.message }

  revalidatePath('/admin/tickets')
  revalidatePath('/admin')
  return {}
}

export async function entregarTicket(
  ticketId: string,
  tiempoSegundos?: number,
  cobroPendiente?: boolean,
) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Solo administradores pueden entregar tickets' }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, estado')
    .eq('id', ticketId)
    .single()

  if (!ticket) return { error: 'Ticket no encontrado' }

  const estadosEntregables = ['verificado', 'con_incidencias']
  if (!estadosEntregables.includes((ticket as any).estado)) {
    return { error: `No se puede entregar un ticket en estado "${(ticket as any).estado}"` }
  }

  const { error } = await supabase
    .from('tickets')
    .update({
      estado: 'despachado',
      despachado_at: new Date().toISOString(),
      tiempo_despacho_segundos: tiempoSegundos ?? null,
      cobro_pendiente: cobroPendiente ?? false,
    })
    .eq('id', ticketId)

  if (error) return { error: error.message }

  revalidatePath('/admin/tickets')
  revalidatePath('/admin')
  return { data: { ok: true } }
}

export async function volverAChecar(ticketId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Solo administradores pueden reenviar tickets al checador' }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, estado')
    .eq('id', ticketId)
    .single()

  if (!ticket) return { error: 'Ticket no encontrado' }

  const estadosReenviables = ['verificado', 'con_incidencias']
  if (!estadosReenviables.includes((ticket as any).estado)) {
    return { error: `No se puede reenviar al checador un ticket en estado "${(ticket as any).estado}"` }
  }

  const { error } = await supabase
    .from('tickets')
    .update({ estado: 'en_verificacion', verificado_at: null })
    .eq('id', ticketId)

  if (error) return { error: error.message }

  revalidatePath('/admin/tickets')
  revalidatePath('/checador')
  return { data: { ok: true } }
}

export async function obtenerDespachadorSugerido() {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }

  const { data, error } = await supabase.rpc('get_despachador_menos_cargado')
  if (error) return { error: error.message }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { error: 'No hay despachadores activos disponibles' }
  return {
    data: {
      id: row.id as string,
      nombre: row.nombre as string,
      carga: Number(row.carga),
    },
  }
}

export async function toggleCobroPendiente(ticketId: string, pendiente: boolean) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden gestionar cobros' }
  }

  const { error } = await supabase
    .from('tickets')
    .update({ cobro_pendiente: pendiente })
    .eq('id', ticketId)

  if (error) return { error: error.message }

  revalidatePath('/admin/tickets')
  return { data: { cobro_pendiente: pendiente } }
}

export async function aprobarTicketConEdicion(
  ticketId: string,
  items: { producto_id: string; cantidad: number; precio_unitario: number; descuento: number; unidad?: string | null }[],
) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden aprobar tickets' }
  }

  if (!items || items.length === 0) {
    return { error: 'El ticket debe tener al menos un producto' }
  }

  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('id, folio, estado')
    .eq('id', ticketId)
    .single()

  if (fetchError || !ticket) {
    return { error: 'Ticket no encontrado' }
  }

  if ((ticket as any).estado !== 'pendiente_aprobacion') {
    return { error: 'El ticket no está pendiente de aprobación' }
  }

  // Obtener precios de todos los productos del ticket
  const productoIds = items.map((i) => i.producto_id)
  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('id, precio_base, precio_mayoreo, unidad_precio_base, unidad_precio_mayoreo')
    .in('id', productoIds)

  if (prodError || !productos) {
    return { error: 'Error al obtener productos' }
  }

  const productosMap = new Map((productos as any[]).map((p) => [p.id, p]))

  let calcResult: ReturnType<typeof calcularItemsConPrecios>
  try {
    calcResult = calcularItemsConPrecios(items, productosMap, true)
  } catch (e: any) {
    return { error: e.message ?? 'Error al calcular precios' }
  }
  const { itemsCalculados, subtotal, descuentoTotal } = calcResult

  // Reemplazar items del ticket
  const { error: deleteError } = await supabase
    .from('ticket_items')
    .delete()
    .eq('ticket_id', ticketId)

  if (deleteError) {
    return { error: 'Error al actualizar los productos del ticket' }
  }

  const newItems = itemsCalculados.map((item) => ({
    id: crypto.randomUUID(),
    ticket_id: ticketId,
    ...item,
    verificado: false,
  }))

  const { error: insertError } = await supabase
    .from('ticket_items')
    .insert(newItems)

  if (insertError) {
    return { error: 'Error al guardar los productos actualizados' }
  }

  // Aprobar ticket y actualizar totales
  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      estado: 'aprobado',
      subtotal,
      descuento: descuentoTotal,
      total: subtotal,
      aprobado_por: profile.id,
      aprobado_at: new Date().toISOString(),
    })
    .eq('id', ticketId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/admin/tickets')
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/despachador/tickets')

  return { data: { folio: (ticket as any).folio } }
}
