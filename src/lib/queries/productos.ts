import { createClient } from '@/lib/supabase/client'
import type { UnidadVenta } from '@/lib/validations/schemas'

export async function searchProductos(query: string) {
  if (!query || query.length < 2) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('productos')
    .select(
      'id, sku, nombre, precio_base, precio_mayoreo, tasa_iva, tasa_ieps, peso_kg, requiere_caducidad,' +
      'vende_pza, vende_kg, vende_caja, vende_bulto, unidad_precio_base, unidad_precio_mayoreo'
    )
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,sku.ilike.%${query}%`)
    .limit(10)

  if (error) return []
  return data as {
    id: string
    sku: string
    nombre: string
    precio_base: number
    precio_mayoreo: number
    tasa_iva: number
    tasa_ieps: number
    peso_kg: number
    requiere_caducidad: boolean
    vende_pza: boolean
    vende_kg: boolean
    vende_caja: boolean
    vende_bulto: boolean
    unidad_precio_base: UnidadVenta | null
    unidad_precio_mayoreo: UnidadVenta | null
  }[]
}
