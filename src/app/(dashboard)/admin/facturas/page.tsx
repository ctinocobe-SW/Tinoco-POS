import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FacturaLink } from '@/components/recepciones/FacturaLink'
import { EstadoBadge } from '@/components/recepciones/EstadoBadge'
import { formatDate, formatMXN } from '@/lib/utils/format'

export const metadata = { title: 'Facturas de proveedor — POS TINOCO' }

type SearchParams = {
  desde?: string
  hasta?: string
  proveedor?: string
  q?: string
}

export default async function FacturasProveedorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { desde, hasta, proveedor, q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  // Default: last 60 days
  const today = new Date().toISOString().split('T')[0]
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const desdeFinal = desde || sixtyDaysAgo
  const hastaFinal = hasta || today

  let query = supabase
    .from('recepciones')
    .select(`
      id, fecha, fecha_factura, folio_factura, monto_factura, factura_url, estado,
      proveedores(id, nombre),
      almacenes(nombre)
    `)
    .order('fecha_factura', { ascending: false, nullsFirst: false })
    .order('fecha', { ascending: false })
    .limit(200)

  // Filtrar por rango: si hay fecha_factura usarla, si no, usar fecha de recepción
  query = query.or(
    `and(fecha_factura.gte.${desdeFinal},fecha_factura.lte.${hastaFinal}),and(fecha_factura.is.null,fecha.gte.${desdeFinal},fecha.lte.${hastaFinal})`,
  )

  if (proveedor) query = query.eq('proveedor_id', proveedor)
  if (q) query = query.ilike('folio_factura', `%${q}%`)

  const { data: recepciones } = await query

  const lista = (recepciones ?? []) as any[]
  const conFactura = lista.filter((r) => r.factura_url)
  const sinFactura = lista.filter((r) => !r.factura_url)
  const totalMonto = lista.reduce((acc, r) => acc + (Number(r.monto_factura) || 0), 0)

  // Cargar proveedores para el filtro
  const { data: proveedoresList } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Facturas de proveedor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lista.length} factura{lista.length !== 1 ? 's' : ''} · {conFactura.length} con archivo · Total {formatMXN(totalMonto)}
          </p>
        </div>
        <Link href="/admin/recepciones" className="text-sm text-brand-accent hover:underline">
          Ver recepciones →
        </Link>
      </div>

      <form className="border border-border rounded-lg p-4 mb-6 grid grid-cols-4 gap-3" method="GET">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Desde</label>
          <input
            name="desde"
            type="date"
            defaultValue={desdeFinal}
            className="w-full bg-white border border-border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Hasta</label>
          <input
            name="hasta"
            type="date"
            defaultValue={hastaFinal}
            className="w-full bg-white border border-border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Proveedor</label>
          <select
            name="proveedor"
            defaultValue={proveedor ?? ''}
            className="w-full bg-white border border-border rounded px-2 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {(proveedoresList ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Folio</label>
          <div className="flex gap-2">
            <input
              name="q"
              type="text"
              placeholder="A-12345"
              defaultValue={q ?? ''}
              className="flex-1 bg-white border border-border rounded px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-brand-accent text-white text-sm rounded hover:bg-brand-accent/80"
            >
              Filtrar
            </button>
          </div>
        </div>
      </form>

      {sinFactura.length > 0 && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          {sinFactura.length} recepción{sinFactura.length !== 1 ? 'es' : ''} en el rango sin archivo de factura adjunto.
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-surface border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left">Fecha factura</th>
              <th className="px-3 py-2 text-left">Folio</th>
              <th className="px-3 py-2 text-left">Proveedor</th>
              <th className="px-3 py-2 text-left">Almacén</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2 text-left">Archivo</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  No hay facturas en el rango seleccionado
                </td>
              </tr>
            )}
            {lista.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  {r.fecha_factura ? formatDate(r.fecha_factura) : (
                    <span className="text-xs text-muted-foreground">({formatDate(r.fecha)})</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.folio_factura ?? '—'}</td>
                <td className="px-3 py-2">{r.proveedores?.nombre ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2 text-xs">{r.almacenes?.nombre ?? '—'}</td>
                <td className="px-3 py-2"><EstadoBadge estado={r.estado} /></td>
                <td className="px-3 py-2 text-right">
                  {r.monto_factura != null ? formatMXN(Number(r.monto_factura)) : '—'}
                </td>
                <td className="px-3 py-2">
                  {r.factura_url ? (
                    <FacturaLink path={r.factura_url} label="Abrir" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin archivo</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/recepciones/${r.id}`}
                    className="text-xs text-brand-accent hover:underline"
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
