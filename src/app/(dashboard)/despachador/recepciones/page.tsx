import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecepcionCard } from '@/components/recepciones/RecepcionCard'
import { formatDate } from '@/lib/utils/format'

export const metadata = { title: 'Recepciones — POS TINOCO' }

export default async function RecepcionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (profile as any)?.rol
  if (!rol || !['admin', 'despachador'].includes(rol)) redirect('/')

  const { data: recepciones } = await supabase
    .from('recepciones')
    .select('id, fecha, confirmado, confirmado_at, proveedor_id, proveedores(nombre)')
    .order('created_at', { ascending: false })
    .limit(50)

  // Obtener conteo de items por recepción
  const recepcionIds = (recepciones ?? []).map((r: any) => r.id)
  const { data: itemCounts } = recepcionIds.length > 0
    ? await supabase
        .from('recepcion_items')
        .select('recepcion_id')
        .in('recepcion_id', recepcionIds)
    : { data: [] }

  const countMap = new Map<string, number>()
  for (const item of (itemCounts ?? []) as any[]) {
    countMap.set(item.recepcion_id, (countMap.get(item.recepcion_id) ?? 0) + 1)
  }

  const lista = (recepciones ?? []).map((r: any) => ({
    id: r.id,
    fecha: r.fecha,
    confirmado: r.confirmado,
    confirmado_at: r.confirmado_at,
    proveedor_nombre: r.proveedores?.nombre ?? null,
    total_items: countMap.get(r.id) ?? 0,
  }))

  const pendientes = lista.filter((r) => !r.confirmado).length
  const confirmadas = lista.filter((r) => r.confirmado).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Recepciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pendientes} pendiente{pendientes !== 1 ? 's' : ''} · {confirmadas} confirmada{confirmadas !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/despachador/recepciones/nueva">
          <Button>
            <Plus size={16} className="mr-1.5" />
            Nueva recepción
          </Button>
        </Link>
      </div>

      {lista.length > 0 ? (
        <div className="space-y-2">
          {lista.map((r) => (
            <RecepcionCard key={r.id} recepcion={r} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay recepciones registradas</p>
        </div>
      )}
    </div>
  )
}
