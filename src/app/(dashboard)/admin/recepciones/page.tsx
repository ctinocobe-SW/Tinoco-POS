import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RecepcionCard, type RecepcionResumen } from '@/components/recepciones/RecepcionCard'

export const metadata = { title: 'Recepciones — POS TINOCO' }

type SearchParams = { estado?: string }

export default async function AdminRecepcionesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { estado: filtroEstado } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  let query = supabase
    .from('recepciones')
    .select('id, fecha, estado, folio_factura, monto_factura, proveedor_id, almacen_id, proveedores(nombre), almacenes(nombre)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filtroEstado === 'pendientes') {
    query = query.in('estado', ['recibida', 'con_discrepancias'])
  } else if (filtroEstado && filtroEstado !== 'todas') {
    query = query.eq('estado', filtroEstado)
  }

  const { data: recepciones } = await query

  const recepcionIds = (recepciones ?? []).map((r: any) => r.id)
  const { data: itemCounts } = recepcionIds.length > 0
    ? await supabase.from('recepcion_items').select('recepcion_id').in('recepcion_id', recepcionIds)
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
    href: `/admin/recepciones/${r.id}`,
  }))

  // Counts globales para los chips
  const { data: allEstados } = await supabase.from('recepciones').select('estado')
  const counts = { pendientes: 0, cerradas: 0, todas: 0, borrador: 0, cancelada: 0 }
  for (const r of (allEstados ?? []) as any[]) {
    counts.todas += 1
    if (r.estado === 'recibida' || r.estado === 'con_discrepancias') counts.pendientes += 1
    if (r.estado === 'cerrada') counts.cerradas += 1
    if (r.estado === 'borrador') counts.borrador += 1
    if (r.estado === 'cancelada') counts.cancelada += 1
  }

  const chips = [
    { key: 'pendientes', label: 'Pendientes de cierre', count: counts.pendientes },
    { key: 'borrador',   label: 'En borrador',          count: counts.borrador },
    { key: 'cerrada',    label: 'Cerradas',             count: counts.cerradas },
    { key: 'cancelada',  label: 'Canceladas',           count: counts.cancelada },
    { key: 'todas',      label: 'Todas',                count: counts.todas },
  ]

  const activo = filtroEstado ?? 'pendientes'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Recepciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revisa, captura costos y cierra para aplicar al inventario
          </p>
        </div>
        <Link
          href="/admin/facturas"
          className="text-sm text-brand-accent hover:underline"
        >
          Ver facturas →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {chips.map((c) => (
          <Link
            key={c.key}
            href={`/admin/recepciones?estado=${c.key}`}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              activo === c.key
                ? 'bg-brand-accent text-white border-brand-accent'
                : 'bg-white text-foreground border-border hover:bg-brand-surface'
            }`}
          >
            {c.label} ({c.count})
          </Link>
        ))}
      </div>

      {lista.length > 0 ? (
        <div className="space-y-2">
          {lista.map((r) => <RecepcionCard key={r.id} recepcion={r} />)}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay recepciones en este filtro</p>
        </div>
      )}
    </div>
  )
}
