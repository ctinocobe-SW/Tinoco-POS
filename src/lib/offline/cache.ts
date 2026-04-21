import { createClient } from '@/lib/supabase/client'
import { offlineDB } from './db'

export async function warmProductosCache(): Promise<void> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('productos')
      .select('id, sku, nombre, categoria, unidad_medida, peso_kg, precio_base, tasa_iva, tasa_ieps, codigo_barras')
      .eq('activo', true)
      .limit(500)

    if (error || !data) return

    const now = new Date().toISOString()
    await offlineDB.productos.bulkPut(
      data.map((p: Record<string, unknown>) => ({ ...p, cached_at: now }))
    )
  } catch {
    // Silencioso — cache warming es best-effort
  }
}

export async function warmClientesCache(): Promise<void> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, razon_social, rfc, whatsapp')
      .eq('activo', true)
      .limit(500)

    if (error || !data) return

    const now = new Date().toISOString()
    await offlineDB.clientes.bulkPut(
      data.map((c: Record<string, unknown>) => ({ ...c, cached_at: now }))
    )
  } catch {
    // Silencioso — cache warming es best-effort
  }
}

export async function warmAllCaches(): Promise<void> {
  await Promise.all([warmProductosCache(), warmClientesCache()])
}
