import { createClient } from '@/lib/supabase/client'

export async function searchClientes(query: string) {
  if (!query || query.length < 2) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, rfc, limite_credito, credito_habilitado')
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,rfc.ilike.%${query}%`)
    .limit(10)

  if (error) return []
  return data as {
    id: string
    nombre: string
    rfc: string | null
    limite_credito: number
    credito_habilitado: boolean
  }[]
}

export async function getTicketsByCliente(clienteId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tickets')
    .select('id, folio, total, created_at, es_credito')
    .eq('cliente_id', clienteId)
    .in('estado', ['despachado', 'facturado', 'cerrado'])
    .eq('es_credito', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data as { id: string; folio: string; total: number; created_at: string }[]
}
