'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import {
  crearListaSurtidoSchema,
  generarBorradorSurtidoSchema,
  type CrearListaSurtidoInput,
  type GenerarBorradorSurtidoInput,
} from '@/lib/validations/schemas'

function revalidateAll() {
  revalidatePath('/despachador/surtido')
  revalidatePath('/admin/surtido')
  revalidatePath('/admin/inventario')
}

export interface BorradorCandidato {
  producto_id: string
  sku: string
  nombre: string
  unidad: 'pza' | 'kg' | 'caja' | 'bulto'
  stock_destino: number
  stock_minimo: number
  stock_maximo: number | null
  cantidad_sugerida: number
  bajo_minimo: boolean
}

export async function generarBorradorSurtido(input: GenerarBorradorSurtidoInput) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Solo admin o despachador pueden generar borradores' }
  }

  const parsed = generarBorradorSurtidoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Cargar preferencias del usuario para defaults
  const { data: pref } = await supabase
    .from('preferencias_surtido')
    .select('top_n, incluir_bajo_minimo, solo_controla_inventario')
    .eq('user_id', profile.id)
    .maybeSingle()

  const top_n = parsed.data.top_n ?? (pref as any)?.top_n ?? 20
  const incluir_bajo_minimo = parsed.data.incluir_bajo_minimo ?? (pref as any)?.incluir_bajo_minimo ?? true
  const solo_controla_inventario = parsed.data.solo_controla_inventario ?? (pref as any)?.solo_controla_inventario ?? true

  const { data, error } = await supabase.rpc('generar_borrador_surtido', {
    p_destino: parsed.data.almacen_destino_id,
    p_top_n: top_n,
    p_incluir_bajo_minimo: incluir_bajo_minimo,
    p_solo_controla_inventario: solo_controla_inventario,
  })

  if (error) return { error: error.message }

  const candidatos: BorradorCandidato[] = (data ?? []).map((r: any) => ({
    producto_id: r.producto_id,
    sku: r.sku,
    nombre: r.nombre,
    unidad: r.unidad,
    stock_destino: Number(r.stock_destino),
    stock_minimo: Number(r.stock_minimo),
    stock_maximo: r.stock_maximo == null ? null : Number(r.stock_maximo),
    cantidad_sugerida: Number(r.cantidad_sugerida),
    bajo_minimo: Boolean(r.bajo_minimo),
  }))

  return { data: candidatos }
}

export async function crearListaSurtido(input: CrearListaSurtidoInput) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'Solo admin o despachador pueden crear listas' }
  }

  const parsed = crearListaSurtidoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const listaId = crypto.randomUUID()

  const { error: listaErr } = await supabase
    .from('listas_surtido')
    .insert({
      id: listaId,
      almacen_destino_id: parsed.data.almacen_destino_id,
      creado_por: profile.id,
      estado: 'borrador',
      notas: parsed.data.notas ?? null,
    })

  if (listaErr) return { error: listaErr.message }

  const { error: itemsErr } = await supabase
    .from('lista_surtido_items')
    .insert(
      parsed.data.items.map((it) => ({
        id: crypto.randomUUID(),
        lista_id: listaId,
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        almacen_origen_item_id: it.almacen_origen_item_id ?? null,
      }))
    )

  if (itemsErr) return { error: itemsErr.message }

  revalidateAll()
  return { data: { id: listaId } }
}

export async function actualizarItemSurtido(
  itemId: string,
  patch: { cantidad?: number; almacen_origen_item_id?: string | null }
) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const update: Record<string, unknown> = {}
  if (typeof patch.cantidad === 'number') {
    if (patch.cantidad <= 0) return { error: 'La cantidad debe ser mayor a 0' }
    update.cantidad = patch.cantidad
  }
  if (patch.almacen_origen_item_id !== undefined) {
    update.almacen_origen_item_id = patch.almacen_origen_item_id
  }

  const { error } = await supabase
    .from('lista_surtido_items')
    .update(update)
    .eq('id', itemId)

  if (error) return { error: error.message }

  revalidateAll()
  return { data: { ok: true } }
}

export async function cambiarEstadoListaSurtido(
  listaId: string,
  estado: 'borrador' | 'confirmada' | 'en_transito' | 'cancelada'
) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('listas_surtido')
    .update({ estado })
    .eq('id', listaId)

  if (error) return { error: error.message }
  revalidateAll()
  return { data: { ok: true } }
}

export async function marcarListaSurtidoEntregada(listaId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (!['admin', 'despachador'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  // Validar que todos los items tengan origen asignado (a nivel item o lista)
  const { data: lista, error: listaErr } = await supabase
    .from('listas_surtido')
    .select('almacen_origen_id, lista_surtido_items(id, almacen_origen_item_id)')
    .eq('id', listaId)
    .single()

  if (listaErr || !lista) return { error: listaErr?.message ?? 'Lista no encontrada' }

  const sinOrigen = ((lista as any).lista_surtido_items ?? []).filter(
    (i: any) => !i.almacen_origen_item_id && !(lista as any).almacen_origen_id
  )
  if (sinOrigen.length > 0) {
    return { error: `Hay ${sinOrigen.length} item(s) sin almacén origen asignado` }
  }

  const { error } = await supabase.rpc('confirmar_entrega_lista_surtido', {
    p_lista_id: listaId,
  })

  if (error) return { error: error.message }
  revalidateAll()
  return { data: { ok: true } }
}
