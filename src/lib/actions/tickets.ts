'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { crearTicketSchema, aprobarTicketSchema } from '@/lib/validations/schemas'
import type { CrearTicketInput } from '@/lib/validations/schemas'

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
  const despachadorId = (inputDespachadorId && profile.rol === 'admin') ? inputDespachadorId : profile.id

  // Obtener precios reales de productos para evitar manipulación
  const productoIds = items.map((i) => i.producto_id)
  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('id, precio_base, tasa_iva, tasa_ieps')
    .in('id', productoIds)

  if (prodError || !productos) {
    return { error: 'Error al obtener productos' }
  }

  const productosMap = new Map(productos.map((p: any) => [p.id, p]))

  // Calcular totales server-side
  let subtotal = 0
  let iva = 0
  let ieps = 0
  let descuentoTotal = 0

  const itemsCalculados = []
  for (const item of items) {
    const prod = productosMap.get(item.producto_id)
    if (!prod) return { error: `Producto ${item.producto_id} no encontrado` }

    const precio = item.precio_unitario > 0 ? item.precio_unitario : (prod as any).precio_base
    const lineSubtotal = precio * item.cantidad - item.descuento
    const lineIva = lineSubtotal * (prod as any).tasa_iva
    const lineIeps = lineSubtotal * (prod as any).tasa_ieps

    subtotal += lineSubtotal
    iva += lineIva
    ieps += lineIeps
    descuentoTotal += item.descuento

    itemsCalculados.push({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: precio,
      descuento: item.descuento,
      subtotal: lineSubtotal,
    })
  }

  const total = subtotal + iva + ieps

  // Insertar ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert({
      id: crypto.randomUUID(),
      cliente_id,
      despachador_id: despachadorId,
      almacen_id: almacen_id ?? profile.almacen_id,
      estado: 'pendiente_aprobacion',
      subtotal,
      iva,
      ieps,
      descuento: descuentoTotal,
      total,
      notas: notas ?? null,
    })
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

  // Verificar que el ticket esté en estado válido
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, estado')
    .eq('id', (item as any).ticket_id)
    .single()

  if (!ticket || !['aprobado', 'en_verificacion'].includes((ticket as any).estado)) {
    return { error: 'El ticket no está en estado de verificación' }
  }

  // Si es el primer item verificado, cambiar estado del ticket a en_verificacion
  if ((ticket as any).estado === 'aprobado') {
    await supabase
      .from('tickets')
      .update({ estado: 'en_verificacion', checador_id: profile.id })
      .eq('id', (item as any).ticket_id)
  }

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

  revalidatePath('/despachador/surtido')
  revalidatePath('/admin/surtido')
  revalidatePath('/admin/tickets')
  revalidatePath('/despachador/tickets')

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
