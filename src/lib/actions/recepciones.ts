'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import {
  crearRecepcionSchema,
  actualizarRecepcionSchema,
  cerrarRecepcionSchema,
  cancelarRecepcionSchema,
} from '@/lib/validations/schemas'
import type {
  CrearRecepcionInput,
  ActualizarRecepcionInput,
  CerrarRecepcionInput,
  CancelarRecepcionInput,
} from '@/lib/validations/schemas'

const ESTADOS_EDITABLES = ['borrador', 'recibida', 'con_discrepancias'] as const
const FACTURAS_BUCKET = 'facturas-proveedores'

function tieneDiscrepancia(item: {
  cantidad_esperada?: number | null
  cantidad_recibida: number
  discrepancia_tipo?: string | null
}): boolean {
  if (item.discrepancia_tipo) return true
  if (item.cantidad_esperada == null) return false
  return Number(item.cantidad_esperada) !== Number(item.cantidad_recibida)
}

// ──────────────────────────────────────────────────────────────
// Crear recepción (checador o admin)
// La recepción nace en estado 'borrador'. Una vez que el checador
// termina la captura llama marcarRecibida() para enviarla al admin.
// ──────────────────────────────────────────────────────────────
export async function crearRecepcion(input: CrearRecepcionInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Solo el checador o el administrador pueden registrar recepciones' }
  }

  const parsed = crearRecepcionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const {
    proveedor_id,
    almacen_id,
    despachador_responsable_id,
    fecha,
    fecha_factura,
    folio_factura,
    monto_factura,
    factura_url,
    notas,
    items,
  } = parsed.data

  const recepcionId = crypto.randomUUID()

  const { error: recepcionError } = await supabase
    .from('recepciones')
    .insert({
      id: recepcionId,
      proveedor_id: proveedor_id ?? null,
      checador_id: profile.id,
      despachador_responsable_id: despachador_responsable_id ?? null,
      almacen_id,
      fecha: fecha ?? new Date().toISOString().split('T')[0],
      fecha_factura: fecha_factura ?? null,
      folio_factura: folio_factura ?? null,
      monto_factura: monto_factura ?? null,
      factura_url: factura_url ?? null,
      notas: notas ?? null,
      estado: 'borrador',
      // columnas legacy: las llenamos para compatibilidad con código antiguo
      despachador_id: profile.id,
      confirmado: false,
    } as any)

  if (recepcionError) {
    return { error: recepcionError.message ?? 'Error al crear la recepción' }
  }

  const recepcionItems = items.map((item) => {
    const discrepancia_auto = tieneDiscrepancia(item)
    return {
      id: crypto.randomUUID(),
      recepcion_id: recepcionId,
      producto_id: item.producto_id,
      cantidad_esperada: item.cantidad_esperada ?? null,
      cantidad_recibida: item.cantidad_recibida,
      fecha_caducidad: item.fecha_caducidad ?? null,
      discrepancia_tipo: item.discrepancia_tipo ?? null,
      discrepancia: item.discrepancia ?? null,
      zona_id: item.zona_id ?? null,
      _has_discrepancia: discrepancia_auto,
    }
  })

  const { error: itemsError } = await supabase
    .from('recepcion_items')
    .insert(recepcionItems.map(({ _has_discrepancia, ...row }) => row))

  if (itemsError) {
    return { error: 'Error al guardar los productos de la recepción' }
  }

  revalidatePath('/checador/recepciones')
  revalidatePath('/admin/recepciones')

  return { data: { id: recepcionId } }
}

// ──────────────────────────────────────────────────────────────
// Actualizar recepción en borrador / recibida (antes del cierre)
// Reemplaza items completos. Solo el checador propietario o admin.
// ──────────────────────────────────────────────────────────────
export async function actualizarRecepcion(input: ActualizarRecepcionInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Sin permisos' }
  }

  const parsed = actualizarRecepcionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { recepcion_id, items, ...rest } = parsed.data

  const { data: recepcion, error: fetchError } = await supabase
    .from('recepciones')
    .select('id, estado, checador_id')
    .eq('id', recepcion_id)
    .single<{ id: string; estado: string; checador_id: string }>()

  if (fetchError || !recepcion) {
    return { error: 'Recepción no encontrada' }
  }

  if (!ESTADOS_EDITABLES.includes(recepcion.estado as any)) {
    return { error: 'Esta recepción ya no se puede editar' }
  }

  if (profile.rol === 'checador' && recepcion.checador_id !== profile.id) {
    return { error: 'Solo el checador que creó la recepción puede modificarla' }
  }

  const updates: Record<string, unknown> = {}
  if (rest.proveedor_id !== undefined) updates.proveedor_id = rest.proveedor_id ?? null
  if (rest.almacen_id !== undefined) updates.almacen_id = rest.almacen_id
  if (rest.despachador_responsable_id !== undefined) updates.despachador_responsable_id = rest.despachador_responsable_id ?? null
  if (rest.fecha !== undefined) updates.fecha = rest.fecha
  if (rest.fecha_factura !== undefined) updates.fecha_factura = rest.fecha_factura ?? null
  if (rest.folio_factura !== undefined) updates.folio_factura = rest.folio_factura ?? null
  if (rest.monto_factura !== undefined) updates.monto_factura = rest.monto_factura ?? null
  if (rest.factura_url !== undefined) updates.factura_url = rest.factura_url ?? null
  if (rest.notas !== undefined) updates.notas = rest.notas ?? null

  if (Object.keys(updates).length > 0) {
    const { error: upErr } = await supabase
      .from('recepciones')
      .update(updates)
      .eq('id', recepcion_id)
    if (upErr) return { error: upErr.message }
  }

  if (items) {
    const { error: delErr } = await supabase
      .from('recepcion_items')
      .delete()
      .eq('recepcion_id', recepcion_id)
    if (delErr) return { error: 'No se pudieron actualizar los productos' }

    const nuevos = items.map((item) => ({
      id: crypto.randomUUID(),
      recepcion_id,
      producto_id: item.producto_id,
      cantidad_esperada: item.cantidad_esperada ?? null,
      cantidad_recibida: item.cantidad_recibida,
      fecha_caducidad: item.fecha_caducidad ?? null,
      discrepancia_tipo: item.discrepancia_tipo ?? null,
      discrepancia: item.discrepancia ?? null,
      zona_id: item.zona_id ?? null,
    }))

    const { error: insErr } = await supabase
      .from('recepcion_items')
      .insert(nuevos)
    if (insErr) return { error: 'No se pudieron guardar los productos' }
  }

  revalidatePath('/checador/recepciones')
  revalidatePath(`/checador/recepciones/${recepcion_id}`)
  revalidatePath('/admin/recepciones')
  revalidatePath(`/admin/recepciones/${recepcion_id}`)

  return { data: { id: recepcion_id } }
}

// ──────────────────────────────────────────────────────────────
// Marcar recepción como recibida (checador termina captura).
// Calcula automáticamente si pasa a 'recibida' o 'con_discrepancias'.
// El inventario NO se mueve aún — espera al cierre del admin.
// ──────────────────────────────────────────────────────────────
export async function marcarRecibida(recepcionId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Sin permisos' }
  }

  const { data: recepcion, error: fetchError } = await supabase
    .from('recepciones')
    .select('id, estado, checador_id')
    .eq('id', recepcionId)
    .single<{ id: string; estado: string; checador_id: string }>()

  if (fetchError || !recepcion) {
    return { error: 'Recepción no encontrada' }
  }

  if (recepcion.estado !== 'borrador') {
    return { error: 'Esta recepción ya fue enviada al admin' }
  }

  if (profile.rol === 'checador' && recepcion.checador_id !== profile.id) {
    return { error: 'Solo el checador que creó la recepción puede enviarla' }
  }

  const { data: items, error: itemsError } = await supabase
    .from('recepcion_items')
    .select('id, cantidad_esperada, cantidad_recibida, discrepancia_tipo')
    .eq('recepcion_id', recepcionId)

  if (itemsError || !items || items.length === 0) {
    return { error: 'Esta recepción no tiene productos' }
  }

  const hayDiscrepancia = (items as any[]).some((it) =>
    tieneDiscrepancia({
      cantidad_esperada: it.cantidad_esperada,
      cantidad_recibida: Number(it.cantidad_recibida),
      discrepancia_tipo: it.discrepancia_tipo,
    }),
  )

  const nuevoEstado = hayDiscrepancia ? 'con_discrepancias' : 'recibida'

  const { error: updError } = await supabase
    .from('recepciones')
    .update({
      estado: nuevoEstado,
      recibido_at: new Date().toISOString(),
    })
    .eq('id', recepcionId)

  if (updError) return { error: updError.message }

  revalidatePath('/checador/recepciones')
  revalidatePath(`/checador/recepciones/${recepcionId}`)
  revalidatePath('/admin/recepciones')

  return { data: { estado: nuevoEstado } }
}

// ──────────────────────────────────────────────────────────────
// Cerrar recepción (solo admin). Captura costos y aplica al inventario.
// La cantidad que entra al inventario es cantidad_recibida (la del checador).
// ──────────────────────────────────────────────────────────────
export async function cerrarRecepcion(input: CerrarRecepcionInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo el administrador puede cerrar recepciones' }
  }

  const parsed = cerrarRecepcionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { recepcion_id, costos, actualizar_costo_producto } = parsed.data

  const { data: recepcion, error: fetchError } = await supabase
    .from('recepciones')
    .select('id, estado, almacen_id')
    .eq('id', recepcion_id)
    .single<{ id: string; estado: string; almacen_id: string }>()

  if (fetchError || !recepcion) {
    return { error: 'Recepción no encontrada' }
  }

  if (!['recibida', 'con_discrepancias'].includes(recepcion.estado)) {
    return { error: 'Solo se pueden cerrar recepciones recibidas por el checador' }
  }

  const { data: items, error: itemsError } = await supabase
    .from('recepcion_items')
    .select('id, producto_id, cantidad_recibida')
    .eq('recepcion_id', recepcion_id)

  if (itemsError || !items || items.length === 0) {
    return { error: 'No hay productos en esta recepción' }
  }

  const itemsArr = items as { id: string; producto_id: string; cantidad_recibida: number }[]

  // Validar que vengan costos para todos los items
  const costosMap = new Map(costos.map((c) => [c.item_id, c.costo_unitario]))
  for (const it of itemsArr) {
    if (!costosMap.has(it.id)) {
      return { error: 'Captura el costo de todos los productos antes de cerrar' }
    }
  }

  // 1) Actualizar costo_unitario en cada item
  for (const it of itemsArr) {
    const costo = costosMap.get(it.id)!
    const { error: cErr } = await supabase
      .from('recepcion_items')
      .update({ costo_unitario: costo })
      .eq('id', it.id)
    if (cErr) return { error: `Error al guardar costos: ${cErr.message}` }
  }

  // 2) Aplicar al inventario: movimiento + upsert
  for (const it of itemsArr) {
    if (Number(it.cantidad_recibida) <= 0) continue // no mover si no se recibió nada

    const { error: movError } = await supabase
      .from('movimientos_inventario')
      .insert({
        id: crypto.randomUUID(),
        producto_id: it.producto_id,
        almacen_id: recepcion.almacen_id,
        tipo: 'entrada',
        cantidad: it.cantidad_recibida,
        referencia_tipo: 'recepcion',
        referencia_id: recepcion_id,
        usuario_id: profile.id,
        notas: null,
      })

    if (movError) {
      return { error: `Error al registrar movimiento: ${movError.message}` }
    }

    const { data: invExistente } = await supabase
      .from('inventario')
      .select('id, stock_actual')
      .eq('producto_id', it.producto_id)
      .eq('almacen_id', recepcion.almacen_id)
      .maybeSingle()

    if (invExistente) {
      const { error: invError } = await supabase
        .from('inventario')
        .update({
          stock_actual: Number((invExistente as any).stock_actual) + Number(it.cantidad_recibida),
        })
        .eq('id', (invExistente as any).id)
      if (invError) return { error: `Error al actualizar inventario: ${invError.message}` }
    } else {
      const { error: invError } = await supabase
        .from('inventario')
        .insert({
          id: crypto.randomUUID(),
          producto_id: it.producto_id,
          almacen_id: recepcion.almacen_id,
          stock_actual: Number(it.cantidad_recibida),
          stock_minimo: 0,
        })
      if (invError) return { error: `Error al crear inventario: ${invError.message}` }
    }

    // 3) Actualizar último costo del producto si así se solicitó
    if (actualizar_costo_producto) {
      const costo = costosMap.get(it.id)!
      if (costo > 0) {
        const { error: prodErr } = await supabase
          .from('productos')
          .update({ costo, updated_at: new Date().toISOString() })
          .eq('id', it.producto_id)
        if (prodErr) {
          return { error: `Error al actualizar costo del producto: ${prodErr.message}` }
        }
      }
    }
  }

  // 4) Marcar recepción como cerrada
  const { error: cerrarErr } = await supabase
    .from('recepciones')
    .update({
      estado: 'cerrada',
      cerrado_at: new Date().toISOString(),
      cerrado_por: profile.id,
      // legacy
      confirmado: true,
      confirmado_at: new Date().toISOString(),
    } as any)
    .eq('id', recepcion_id)

  if (cerrarErr) return { error: cerrarErr.message }

  revalidatePath('/admin/recepciones')
  revalidatePath(`/admin/recepciones/${recepcion_id}`)
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/facturas')
  revalidatePath('/checador/recepciones')

  return { data: { cerrada: true } }
}

// ──────────────────────────────────────────────────────────────
// Cancelar recepción (admin o checador propietario, antes del cierre)
// ──────────────────────────────────────────────────────────────
export async function cancelarRecepcion(input: CancelarRecepcionInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Sin permisos' }
  }

  const parsed = cancelarRecepcionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { recepcion_id, motivo } = parsed.data

  const { data: recepcion, error: fetchError } = await supabase
    .from('recepciones')
    .select('id, estado, checador_id, notas')
    .eq('id', recepcion_id)
    .single<{ id: string; estado: string; checador_id: string; notas: string | null }>()

  if (fetchError || !recepcion) return { error: 'Recepción no encontrada' }

  if (recepcion.estado === 'cerrada') {
    return { error: 'No se puede cancelar una recepción ya cerrada' }
  }
  if (recepcion.estado === 'cancelada') {
    return { error: 'Esta recepción ya estaba cancelada' }
  }

  if (profile.rol === 'checador' && recepcion.checador_id !== profile.id) {
    return { error: 'Solo el checador que creó la recepción puede cancelarla' }
  }

  const notasFinales = motivo
    ? [recepcion.notas, `Cancelada: ${motivo}`].filter(Boolean).join(' · ')
    : recepcion.notas

  const { error: upErr } = await supabase
    .from('recepciones')
    .update({ estado: 'cancelada', notas: notasFinales })
    .eq('id', recepcion_id)

  if (upErr) return { error: upErr.message }

  revalidatePath('/checador/recepciones')
  revalidatePath('/admin/recepciones')

  return { data: { cancelada: true } }
}

// ──────────────────────────────────────────────────────────────
// Subir factura del proveedor a Storage y vincularla a la recepción
// El cliente envía un FormData con: recepcion_id, file
// ──────────────────────────────────────────────────────────────
export async function subirFacturaProveedor(formData: FormData) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Sin permisos' }
  }

  const recepcion_id = formData.get('recepcion_id')
  const file = formData.get('file')

  if (typeof recepcion_id !== 'string' || !(file instanceof File) || file.size === 0) {
    return { error: 'Archivo o recepción inválidos' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: 'El archivo no puede pesar más de 10MB' }
  }

  const tiposPermitidos = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
  if (!tiposPermitidos.includes(file.type)) {
    return { error: 'Solo se aceptan PDF o imágenes (PNG/JPG/WEBP)' }
  }

  const { data: recepcion, error: fetchError } = await supabase
    .from('recepciones')
    .select('id, estado, checador_id, fecha_factura, fecha')
    .eq('id', recepcion_id)
    .single<{ id: string; estado: string; checador_id: string; fecha_factura: string | null; fecha: string }>()

  if (fetchError || !recepcion) return { error: 'Recepción no encontrada' }

  if (recepcion.estado === 'cerrada' || recepcion.estado === 'cancelada') {
    return { error: 'No se puede modificar la factura de una recepción cerrada o cancelada' }
  }

  if (profile.rol === 'checador' && recepcion.checador_id !== profile.id) {
    return { error: 'Solo el checador que creó la recepción puede subir su factura' }
  }

  const fechaRef = recepcion.fecha_factura ?? recepcion.fecha
  const [year, month] = fechaRef.split('-')
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const path = `${year}/${month}/${recepcion_id}/${Date.now()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(FACTURAS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadErr) return { error: `No se pudo subir la factura: ${uploadErr.message}` }

  const { error: linkErr } = await supabase
    .from('recepciones')
    .update({ factura_url: path })
    .eq('id', recepcion_id)

  if (linkErr) return { error: linkErr.message }

  revalidatePath(`/checador/recepciones/${recepcion_id}`)
  revalidatePath(`/admin/recepciones/${recepcion_id}`)
  revalidatePath('/admin/facturas')

  return { data: { factura_url: path } }
}

// ──────────────────────────────────────────────────────────────
// Generar URL firmada para visualizar la factura
// ──────────────────────────────────────────────────────────────
export async function obtenerUrlFactura(path: string) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (!['admin', 'checador'].includes(profile.rol)) {
    return { error: 'Sin permisos' }
  }

  const { data, error } = await supabase.storage
    .from(FACTURAS_BUCKET)
    .createSignedUrl(path, 60 * 10) // 10 minutos

  if (error || !data) return { error: error?.message ?? 'No se pudo generar el enlace' }
  return { data: { url: data.signedUrl } }
}
