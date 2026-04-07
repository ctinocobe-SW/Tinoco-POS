import { createClient } from '@/lib/supabase/client'

export async function searchClientes(query: string) {
  if (!query || query.length < 2) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, rfc')
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,rfc.ilike.%${query}%`)
    .limit(10)

  if (error) return []
  return data as { id: string; nombre: string; rfc: string | null }[]
}
