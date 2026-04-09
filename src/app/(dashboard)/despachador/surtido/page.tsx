import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SurtidoCard } from '@/components/surtido/SurtidoCard'
import { ListasAlmacenSection } from '@/components/surtido/ListasAlmacenSection'

export const metadata = { title: 'Surtido — POS TINOCO' }

export default async function DespachadorSurtidoPage() {
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

  // Tickets listos para despachar
  const { data: porDespachar } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at, verificado_at, despachado_at, almacen_id, clientes(nombre), almacenes(nombre)')
    .in('estado', ['verificado', 'con_incidencias'])
    .order('verificado_at', { ascending: true })

  const { data: despachados } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at, verificado_at, despachado_at, almacen_id, clientes(nombre), almacenes(nombre)')
    .eq('estado', 'despachado')
    .order('despachado_at', { ascending: false })
    .limit(20)

  const allIds = [
    ...(porDespachar ?? []).map((t: any) => t.id),
    ...(despachados ?? []).map((t: any) => t.id),
  ]

  const { data: itemCounts } = allIds.length > 0
    ? await supabase.from('ticket_items').select('ticket_id').in('ticket_id', allIds)
    : { data: [] }

  const countMap = new Map<string, number>()
  for (const item of (itemCounts ?? []) as any[]) {
    countMap.set(item.ticket_id, (countMap.get(item.ticket_id) ?? 0) + 1)
  }

  const mapTicket = (t: any) => ({
    id: t.id, folio: t.folio, estado: t.estado, total: t.total,
    created_at: t.created_at, verificado_at: t.verificado_at ?? null,
    despachado_at: t.despachado_at ?? null,
    cliente_nombre: t.clientes?.nombre ?? null,
    almacen_nombre: t.almacenes?.nombre ?? null,
    total_items: countMap.get(t.id) ?? 0,
  })

  const listaPorDespachar = (porDespachar ?? []).map(mapTicket)
  const listaDespachados = (despachados ?? []).map(mapTicket)

  // Listas de almacén
  const { data: listasAlmacen } = await supabase
    .from('listas_almacen')
    .select('id, nombre, notas, estado, created_at, lista_almacen_items(id)')
    .order('created_at', { ascending: false })
    .limit(30)

  const listasAlmacenData = (listasAlmacen ?? []).map((l: any) => ({
    id: l.id as string,
    nombre: l.nombre as string,
    notas: l.notas as string | null,
    estado: l.estado as string,
    created_at: l.created_at as string,
    total_items: Array.isArray(l.lista_almacen_items) ? l.lista_almacen_items.length : 0,
  }))

  return (
    <div className="space-y-8">
      {/* Sección: Listas de almacén */}
      <ListasAlmacenSection listas={listasAlmacenData} />

      {/* Sección: Despacho de tickets */}
      <div>
        <h2 className="text-lg font-heading font-semibold mb-1">Despacho de tickets</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {listaPorDespachar.length} listo{listaPorDespachar.length !== 1 ? 's' : ''} para despachar
        </p>

        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Listos para despachar
          </h3>
          {listaPorDespachar.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-border rounded-lg">
              No hay tickets verificados pendientes de despacho
            </div>
          ) : (
            <div className="space-y-2">
              {listaPorDespachar.map((t) => <SurtidoCard key={t.id} ticket={t} />)}
            </div>
          )}
        </section>

        {listaDespachados.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Despachados recientemente
            </h3>
            <div className="space-y-2">
              {listaDespachados.map((t) => <SurtidoCard key={t.id} ticket={t} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
