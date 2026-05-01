import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecepcionCard, type RecepcionResumen } from '@/components/recepciones/RecepcionCard'

export const metadata = { title: 'Recepciones — POS TINOCO' }

export default async function ChecadorRecepcionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (profile as any)?.rol
  if (!rol || !['admin', 'checador'].includes(rol)) redirect('/')

  const { data: recepciones } = await supabase
    .from('recepciones')
    .select('id, fecha, estado, folio_factura, monto_factura, proveedor_id, almacen_id, proveedores(nombre), almacenes(nombre)')
    .order('created_at', { ascending: false })
    .limit(80)

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

  const lista: RecepcionResumen[] = (recepciones ?? []).map((r: any) => ({
    id: r.id,
    fecha: r.fecha,
    estado: r.estado,
    proveedor_nombre: r.proveedores?.nombre ?? null,
    almacen_nombre: r.almacenes?.nombre ?? null,
    total_items: countMap.get(r.id) ?? 0,
    folio_factura: r.folio_factura,
    monto_factura: r.monto_factura,
    href: `/checador/recepciones/${r.id}`,
  }))

  const borradores = lista.filter((r) => r.estado === 'borrador').length
  const enviadas = lista.filter((r) => r.estado === 'recibida' || r.estado === 'con_discrepancias').length
  const cerradas = lista.filter((r) => r.estado === 'cerrada').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Recepciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {borradores} borrador{borradores !== 1 ? 'es' : ''} · {enviadas} pendiente{enviadas !== 1 ? 's' : ''} de cierre · {cerradas} cerrada{cerradas !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/checador/recepciones/nueva">
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
          <p className="text-xs mt-1">Crea una nueva cuando llegue mercancía del proveedor</p>
        </div>
      )}
    </div>
  )
}
