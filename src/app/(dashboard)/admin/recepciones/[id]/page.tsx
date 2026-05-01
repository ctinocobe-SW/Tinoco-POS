import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EstadoBadge } from '@/components/recepciones/EstadoBadge'
import { FacturaUploader } from '@/components/recepciones/FacturaUploader'
import { CerrarRecepcionDialog } from '@/components/recepciones/CerrarRecepcionDialog'
import { CancelarRecepcionButton } from '@/components/recepciones/MarcarRecibidaButton'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDateTime, formatMXN } from '@/lib/utils/format'

export const metadata = { title: 'Recepción — POS TINOCO' }

export default async function AdminRecepcionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const { data: recepcion } = await supabase
    .from('recepciones')
    .select(`
      id, fecha, fecha_factura, folio_factura, monto_factura, factura_url,
      estado, notas, recibido_at, cerrado_at,
      proveedores(nombre, rfc),
      almacenes(nombre, tipo),
      checador:profiles!recepciones_checador_id_fkey(nombre),
      responsable:profiles!recepciones_despachador_responsable_id_fkey(nombre),
      cierre:profiles!recepciones_cerrado_por_fkey(nombre)
    `)
    .eq('id', id)
    .single<any>()

  if (!recepcion) notFound()

  const { data: itemsData } = await supabase
    .from('recepcion_items')
    .select(`
      id, producto_id, cantidad_esperada, cantidad_recibida, fecha_caducidad,
      discrepancia_tipo, discrepancia, costo_unitario,
      productos(sku, nombre, costo),
      zonas(nombre)
    `)
    .eq('recepcion_id', id)
    .order('id')

  const items = (itemsData ?? []) as any[]

  const puedeCerrar = recepcion.estado === 'recibida' || recepcion.estado === 'con_discrepancias'

  const itemsParaCierre = items.map((it) => ({
    id: it.id,
    producto_nombre: it.productos?.nombre ?? '',
    sku: it.productos?.sku ?? '',
    cantidad_recibida: Number(it.cantidad_recibida),
    costo_unitario: it.costo_unitario != null ? Number(it.costo_unitario) : null,
    costo_actual_producto: it.productos?.costo != null ? Number(it.productos.costo) : null,
  }))

  const totalCosto = items.reduce((acc, it) => {
    if (it.costo_unitario == null) return acc
    return acc + Number(it.costo_unitario) * Number(it.cantidad_recibida)
  }, 0)

  return (
    <div>
      <Link
        href="/admin/recepciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={14} />
        Volver
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-semibold">Recepción</h1>
          <EstadoBadge estado={recepcion.estado} />
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          {puedeCerrar && itemsParaCierre.length > 0 && (
            <CerrarRecepcionDialog
              recepcionId={recepcion.id}
              items={itemsParaCierre}
              montoFactura={recepcion.monto_factura != null ? Number(recepcion.monto_factura) : null}
            />
          )}
          <CancelarRecepcionButton recepcionId={recepcion.id} estado={recepcion.estado} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <DataRow label="Proveedor"     value={recepcion.proveedores?.nombre ?? '—'} />
        <DataRow label="Almacén"       value={recepcion.almacenes ? `${recepcion.almacenes.nombre} (${recepcion.almacenes.tipo})` : '—'} />
        <DataRow label="Fecha"         value={formatDate(recepcion.fecha)} />
        <DataRow label="Folio factura" value={recepcion.folio_factura ?? '—'} />
        <DataRow label="Fecha factura" value={recepcion.fecha_factura ? formatDate(recepcion.fecha_factura) : '—'} />
        <DataRow label="Monto factura" value={recepcion.monto_factura != null ? formatMXN(Number(recepcion.monto_factura)) : '—'} />
        <DataRow label="Checador"      value={recepcion.checador?.nombre ?? '—'} />
        <DataRow label="Despachador asignado" value={recepcion.responsable?.nombre ?? 'Sin asignar'} />
        <DataRow label="Recibida el"   value={recepcion.recibido_at ? formatDateTime(recepcion.recibido_at) : '—'} />
        {recepcion.cerrado_at && (
          <>
            <DataRow label="Cerrada el"    value={formatDateTime(recepcion.cerrado_at)} />
            <DataRow label="Cerrada por"   value={recepcion.cierre?.nombre ?? '—'} />
            <DataRow label="Costo total"   value={formatMXN(totalCosto)} />
          </>
        )}
      </div>

      <div className="mb-6 border border-border rounded-lg p-4">
        <h2 className="text-sm font-medium mb-2">Factura del proveedor</h2>
        <FacturaUploader
          recepcionId={recepcion.id}
          facturaUrl={recepcion.factura_url}
          disabled={recepcion.estado === 'cerrada' || recepcion.estado === 'cancelada'}
        />
      </div>

      {/* DESKTOP: tabla */}
      <div className="hidden md:block border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-3 py-2 text-left">Producto</th>
              <th className="px-3 py-2 text-center w-20">Esperada</th>
              <th className="px-3 py-2 text-center w-20">Recibida</th>
              <th className="px-3 py-2 text-left w-32">Discrepancia</th>
              <th className="px-3 py-2 text-left w-28">Zona</th>
              <th className="px-3 py-2 text-right w-24">Costo unit.</th>
              <th className="px-3 py-2 text-right w-24">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const sub = it.costo_unitario != null
                ? Number(it.costo_unitario) * Number(it.cantidad_recibida)
                : null
              return (
                <tr key={it.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{it.productos?.nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">{it.productos?.sku}</p>
                  </td>
                  <td className="px-3 py-2 text-center">{it.cantidad_esperada ?? '—'}</td>
                  <td className="px-3 py-2 text-center font-medium">{Number(it.cantidad_recibida)}</td>
                  <td className="px-3 py-2">
                    {it.discrepancia_tipo ? (
                      <div>
                        <Badge variant="warning">{it.discrepancia_tipo}</Badge>
                        {it.discrepancia && <p className="text-xs text-muted-foreground mt-1">{it.discrepancia}</p>}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{it.zonas?.nombre ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-xs">
                    {it.costo_unitario != null ? formatMXN(Number(it.costo_unitario)) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {sub != null ? formatMXN(sub) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE: cards */}
      <ul className="md:hidden divide-y divide-border border border-border rounded-lg">
        {items.map((it) => {
          const sub = it.costo_unitario != null
            ? Number(it.costo_unitario) * Number(it.cantidad_recibida)
            : null
          return (
            <li key={it.id} className="px-3 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{it.productos?.nombre}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{it.productos?.sku}</p>
                </div>
                {it.discrepancia_tipo && <Badge variant="warning">{it.discrepancia_tipo}</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Esperada</p>
                  <p>{it.cantidad_esperada ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recibida</p>
                  <p className="font-medium">{Number(it.cantidad_recibida)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Costo</p>
                  <p>{it.costo_unitario != null ? formatMXN(Number(it.costo_unitario)) : '—'}</p>
                </div>
              </div>
              {(it.zonas?.nombre || it.discrepancia) && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {it.zonas?.nombre && <p>Zona: {it.zonas.nombre}</p>}
                  {it.discrepancia && <p>{it.discrepancia}</p>}
                </div>
              )}
              {sub != null && (
                <p className="text-xs text-right">
                  Subtotal: <span className="font-medium">{formatMXN(sub)}</span>
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {recepcion.notas && (
        <div className="mt-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notas</p>
          <p>{recepcion.notas}</p>
        </div>
      )}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  )
}
