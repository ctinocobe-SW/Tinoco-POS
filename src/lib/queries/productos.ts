import { createClient } from '@/lib/supabase/client'
import { offlineDB } from '@/lib/offline/db'

export async function searchProductos(query: string) {
  if (!query || query.length < 2) return []

  // Fallback a cache local cuando no hay conexión
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const q = query.toLowerCase()
    const cached = await offlineDB.productos
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
      .limit(10)
      .toArray()
    return cached.map((p) => ({
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      precio_base: p.precio_base,
      tasa_iva: p.tasa_iva,
      tasa_ieps: p.tasa_ieps,
      peso_kg: p.peso_kg,
      requiere_caducidad: false,
    }))
  }

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
