'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import type { MetodoPagoCredito } from '@/types/database.types'

function revalidateAll() {
  revalidatePath('/admin/creditos')
}

// ─── Crear crédito ─────────────────────────────────────────────────────────────
export async function crearCredito(input: {
  cliente_id: string
  ticket_id?: string
  monto_original: number
  plazo_dias: number
  fecha_otorgamiento?: string   // ISO date, default hoy
  tasa_mora_pct?: number
  aval_nombre?: string
  lugar_expedicion?: string
  notas?: string
}) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Solo el administrador puede otorgar créditos' }

  if (!input.cliente_id) return { error: 'Selecciona un cliente' }
  if (!input.monto_original || input.monto_original <= 0) return { error: 'El monto debe ser mayor a 0' }
  if (!input.plazo_dias || input.plazo_dias <= 0) return { error: 'El plazo debe ser mayor a 0' }

  const fechaOtorg = input.fecha_otorgamiento ?? new Date().toISOString().split('T')[0]
  const fechaVenc = new Date(fechaOtorg)
  fechaVenc.setDate(fechaVenc.getDate() + input.plazo_dias)
  const fechaVencStr = fechaVenc.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('creditos')
    .insert({
      cliente_id: input.cliente_id,
      ticket_id: input.ticket_id ?? null,
      monto_original: input.monto_original,
      saldo: input.monto_original,
      fecha_otorgamiento: fechaOtorg,
      fecha_vencimiento: fechaVencStr,
      plazo_dias: input.plazo_dias,
      tasa_mora_pct: input.tasa_mora_pct ?? 0,
      estado: 'vigente',
      aval_nombre: input.aval_nombre ?? null,
      lugar_expedicion: input.lugar_expedicion ?? 'México',
      notas: input.notas ?? null,
      otorgado_por: profile.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Vincular ticket al crédito si se proporcionó
  if (input.ticket_id) {
    await supabase
      .from('tickets')
      .update({ es_credito: true, credito_id: data.id })
      .eq('id', input.ticket_id)
  }

  revalidateAll()
  return { data: { id: data.id } }
}

// ─── Registrar abono ───────────────────────────────────────────────────────────
export async function registrarAbono(creditoId: string, input: {
  monto: number
  fecha: string
  metodo_pago: MetodoPagoCredito
  referencia?: string
  notas?: string
}) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Solo el administrador puede registrar abonos' }

  // Obtener saldo actual
  const { data: credito, error: fetchError } = await supabase
    .from('creditos')
    .select('saldo, estado')
    .eq('id', creditoId)
    .single()

  if (fetchError || !credito) return { error: 'Crédito no encontrado' }
  if (credito.estado === 'liquidado') return { error: 'El crédito ya está liquidado' }
  if (credito.estado === 'cancelado') return { error: 'El crédito está cancelado' }
  if (input.monto <= 0) return { error: 'El monto debe ser mayor a 0' }
  if (input.monto > Number(credito.saldo)) return { error: `El abono ($${input.monto}) supera el saldo ($${credito.saldo})` }

  // Insertar abono
  const { error: abonoError } = await supabase
    .from('abonos_credito')
    .insert({
      credito_id: creditoId,
      monto: input.monto,
      fecha: input.fecha,
      metodo_pago: input.metodo_pago,
      referencia: input.referencia ?? null,
      notas: input.notas ?? null,
      registrado_por: profile.id,
    })

  if (abonoError) return { error: abonoError.message }

  // Actualizar saldo
  const nuevoSaldo = Number(credito.saldo) - input.monto
  const nuevoEstado = nuevoSaldo <= 0 ? 'liquidado' : credito.estado

  const { error: updateError } = await supabase
    .from('creditos')
    .update({ saldo: nuevoSaldo, estado: nuevoEstado })
    .eq('id', creditoId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/admin/creditos/${creditoId}`)
  revalidateAll()
  return { data: { saldo: nuevoSaldo, liquidado: nuevoEstado === 'liquidado' } }
}

// ─── Liquidar crédito ──────────────────────────────────────────────────────────
export async function liquidarCredito(creditoId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Acceso denegado' }

  const { error } = await supabase
    .from('creditos')
    .update({ estado: 'liquidado', saldo: 0 })
    .eq('id', creditoId)

  if (error) return { error: error.message }
  revalidatePath(`/admin/creditos/${creditoId}`)
  revalidateAll()
  return { data: { ok: true } }
}

// ─── Cancelar crédito ─────────────────────────────────────────────────────────
export async function cancelarCredito(creditoId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Acceso denegado' }

  const { error } = await supabase
    .from('creditos')
    .update({ estado: 'cancelado' })
    .eq('id', creditoId)

  if (error) return { error: error.message }
  revalidatePath(`/admin/creditos/${creditoId}`)
  revalidateAll()
  return { data: { ok: true } }
}

// ─── Actualizar estados vencidos ───────────────────────────────────────────────
// Llamar al inicio de la página de créditos para marcar los que ya vencieron
export async function actualizarVencidos() {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return

  const hoy = new Date().toISOString().split('T')[0]

  await supabase
    .from('creditos')
    .update({ estado: 'vencido' })
    .eq('estado', 'vigente')
    .lt('fecha_vencimiento', hoy)
    .gt('saldo', 0)
}
