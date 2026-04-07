import { createClient } from '@/lib/supabase/client'

export async function getAlmacenes(): Promise<{ id: string; nombre: string; tipo: string }[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('almacenes')
    .select('id, nombre, tipo')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (error || !data) return []
  return data as { id: string; nombre: string; tipo: string }[]
}
