import { createClient } from '@/lib/supabase/client'

export async function searchProveedores(query: string): Promise<{ id: string; nombre: string; rfc: string | null }[]> {
  if (query.length < 2) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('proveedores')
    .select('id, nombre, rfc')
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,rfc.ilike.%${query}%`)
    .limit(10)

  if (error || !data) return []
  return data as { id: string; nombre: string; rfc: string | null }[]
}
