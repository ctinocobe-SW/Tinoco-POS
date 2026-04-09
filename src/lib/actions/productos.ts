'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { productoSchema } from '@/lib/validations/schemas'
import type { ProductoInput } from '@/lib/validations/schemas'

const SKU_PREFIX: Record<string, string> = {
  Chiles: 'CHI', Pastas: 'PAS', Croquetas: 'CRO', Semillas: 'SEM',
  Enlatados: 'ENL', Medicina: 'MED', Bebidas: 'BEB', Botanas: 'BOT',
  Gomitas: 'GOM', Molidos: 'MOL', Abarrotes: 'ABA', Otros: 'OTR',
}

function generarSku(categoria: string): string {
  const prefix = SKU_PREFIX[categoria] ?? 'PRD'
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${suffix}`
}

export async function crearProducto(input: ProductoInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden crear productos' }
  }

  const parsed = productoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { stock_inicial, almacen_id_inicial, ...productoData } = parsed.data

  // Auto-generar SKU único
  let sku = generarSku(productoData.categoria)
  let intentos = 0
  while (intentos < 5) {
    const { data: existing } = await supabase
      .from('productos')
      .select('id')
      .eq('sku', sku)
      .maybeSingle()
    if (!existing) break
    sku = generarSku(productoData.categoria)
    intentos++
  }

  const productoId = crypto.randomUUID()

  const { error } = await supabase
    .from('productos')
    .insert({
      id: productoId,
      sku,
      unidad_medida: 'pza',
      activo: true,
      ...productoData,
    })

  if (error) {
    return { error: error.message ?? 'Error al crear el producto' }
  }

  // Crear stock inicial si se especificó
  if (stock_inicial && stock_inicial > 0 && almacen_id_inicial) {
    await supabase.from('inventario').insert({
      id: crypto.randomUUID(),
      producto_id: productoId,
      almacen_id: almacen_id_inicial,
      stock_actual: stock_inicial,
      stock_minimo: 0,
    })

    await supabase.from('movimientos_inventario').insert({
      id: crypto.randomUUID(),
      producto_id: productoId,
      almacen_id: almacen_id_inicial,
      tipo: 'entrada',
      cantidad: stock_inicial,
      referencia_tipo: 'stock_inicial',
      referencia_id: null,
      usuario_id: profile.id,
      notas: 'Stock inicial al crear producto',
    })
  }

  revalidatePath('/admin/productos')
  revalidatePath('/admin/inventario')

  return { data: { id: productoId, sku } }
}

export async function actualizarProducto(id: string, input: Partial<ProductoInput>) {
  const { profile, supabase } = await getAuthenticatedProfile()

  if (profile.rol !== 'admin') {
    return { error: 'Solo administradores pueden editar productos' }
  }

  // Excluir campos que no se editan
  const { stock_inicial, almacen_id_inicial, ...updateData } = input as any

  const parsed = productoSchema.omit({ stock_inicial: true, almacen_id_inicial: true }).partial().safeParse(updateData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
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
