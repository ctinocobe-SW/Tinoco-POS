import { createClient } from '@/lib/supabase/client'

export async function searchProductos(query: string) {
  if (!query || query.length < 2) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('productos')
    .select('id, sku, nombre, precio_base, tasa_iva, tasa_ieps, peso_kg, requiere_caducidad')
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,sku.ilike.%${query}%`)
    .limit(10)

  if (error) return []
  return data as {
    id: string
    sku: string
    nombre: string
    precio_base: number
    tasa_iva: number
    tasa_ieps: number
    peso_kg: number
    requiere_caducidad: boolean
  }[]
}
