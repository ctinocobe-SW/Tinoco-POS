import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RecepcionForm } from '@/components/recepciones/RecepcionForm'
import { EstadoBadge } from '@/components/recepciones/EstadoBadge'
import { FacturaUploader } from '@/components/recepciones/FacturaUploader'
import { MarcarRecibidaButton, CancelarRecepcionButton } from '@/components/recepciones/MarcarRecibidaButton'
import { formatDate, formatMXN } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Recepción — POS TINOCO' }

const ESTADOS_EDITABLES = ['borrador'] as const

export default async function RecepcionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (profile as any)?.rol as string
  if (!rol || !['admin', 'checador'].includes(rol)) redirect('/')

  const { data: recepcion } = await supabase
    .from('recepciones')
    .select(`
      id, fecha, fecha_factura, folio_factura, monto_factura, factura_url,
      estado, notas, proveedor_id, almacen_id, despachador_responsable_id,
      checador_id, recibido_at, cerrado_at,
      proveedores(id, nombre, rfc),
      almacenes(id, nombre, tipo),
      responsable:profiles!recepciones_responsable_fk(id, nombre),
      checador:profiles!recepciones_checador_fk(id, nombre)
    `)
    .eq('id', id)
    .single<any>()

  if (!recepcion) notFound()

  const { data: itemsData } = await supabase
    .from('recepcion_items')
    .select(`
      id, producto_id, cantidad_esperada, cantidad_recibida, fecha_caducidad,
      discrepancia_tipo, discrepancia, zona_id, costo_unitario,
      productos(sku, nombre, requiere_caducidad),
      zonas(nombre)
    `)
    .eq('recepcion_id', id)
    .order('id')

  const items = (itemsData ?? []) as any[]

  const editable = ESTADOS_EDITABLES.includes(recepcion.estado)

  if (editable) {
    const [almacenesRes, zonasRes, despachadoresRes] = await Promise.all([
      supabase.from('almacenes').select('id, nombre, tipo').eq('activo', true).order('nombre'),
      supabase.from('zonas').select('id, nombre, almacen_id, profiles(nombre)').eq('activo', true).order('nombre'),
      supabase.from('profiles').select('id, nombre').eq('rol', 'despachador').eq('activo', true).order('nombre'),
    ])

    const almacenes = (almacenesRes.data ?? []) as { id: string; nombre: string; tipo: string }[]
    const zonas = (zonasRes.data ?? []).map((z: any) => ({
      id: z.id, nombre: z.nombre, almacen_id: z.almacen_id,
      despachador_nombre: z.profiles?.nombre ?? null,
    }))
    const despachadores = (despachadoresRes.data ?? []) as { id: string; nombre: string }[]

    return (
      <div>
        <Link href="/checador/recepciones" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={14} />
          Volver
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-heading font-semibold">Recepción</h1>
          <EstadoBadge estado={recepcion.estado} />
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Editando borrador. Sube la factura y envíala al admin cuando termines.
        </p>

        <div className="mb-6 border border-border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-2">Factura del proveedor</h2>
          <FacturaUploader recepcionId={recepcion.id} facturaUrl={recepcion.factura_url} />
        </div>

        <RecepcionForm
          almacenes={almacenes}
          zonas={zonas}
          despachadores={despachadores}
          defaultProveedor={
            recepcion.proveedores
              ? { id: recepcion.proveedores.id, nombre: recepcion.proveedores.nombre, rfc: recepcion.proveedores.rfc }
              : null
          }
          initial={{
            recepcion_id: recepcion.id,
            proveedor_id: recepcion.proveedor_id,
            almacen_id: recepcion.almacen_id,
            despachador_responsable_id: recepcion.despachador_responsable_id,
            fecha: recepcion.fecha,
            fecha_factura: recepcion.fecha_factura,
            folio_factura: recepcion.folio_factura,
            monto_factura: recepcion.monto_factura,
            notas: recepcion.notas,
            items: items.map((it) => ({
              producto_id: it.producto_id,
              sku: it.productos?.sku ?? '',
              nombre: it.productos?.nombre ?? '',
              requiere_caducidad: it.productos?.requiere_caducidad ?? false,
              cantidad_esperada: it.cantidad_esperada,
              cantidad_recibida: Number(it.cantidad_recibida),
              fecha_caducidad: it.fecha_caducidad,
              discrepancia_tipo: it.discrepancia_tipo,
              discrepancia: it.discrepancia,
              zona_id: it.zona_id,
            })),
          }}
        />

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sticky bottom-0 bg-brand-bg pt-3 pb-2">
          <CancelarRecepcionButton recepcionId={recepcion.id} estado={recepcion.estado} />
          <MarcarRecibidaButton recepcionId={recepcion.id} />
        </div>
      </div>
    )
  }

  // Vista de solo lectura para estados recibida / con_discrepancias / cerrada / cancelada
  return (
    <div>
      <Link href="/checador/recepciones" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={14} />
        Volver
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-heading font-semibold">Recepción</h1>
        <EstadoBadge estado={recepcion.estado} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <DataRow label="Proveedor"      value={recepcion.proveedores?.nombre ?? '—'} />
        <DataRow label="Almacén"        value={`${recepcion.almacenes?.nombre} (${recepcion.almacenes?.tipo})`} />
        <DataRow label="Fecha"          value={formatDate(recepcion.fecha)} />
        <DataRow label="Folio factura"  value={recepcion.folio_factura ?? '—'} />
        <DataRow label="Monto factura"  value={recepcion.monto_factura != null ? formatMXN(Number(recepcion.monto_factura)) : '—'} />
        <DataRow label="Checador"       value={recepcion.checador?.nombre ?? '—'} />
        <DataRow label="Despachador asignado" value={recepcion.responsable?.nombre ?? 'Sin asignar'} />
        {recepcion.recibido_at && (
          <DataRow label="Enviada al admin" value={formatDate(recepcion.recibido_at)} />
        )}
        {recepcion.cerrado_at && (
          <DataRow label="Cerrada"        value={formatDate(recepcion.cerrado_at)} />
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

      <div className="hidden md:block border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-3 py-2 text-left">Producto</th>
              <th className="px-3 py-2 text-center w-20">Esperada</th>
              <th className="px-3 py-2 text-center w-20">Recibida</th>
              <th className="px-3 py-2 text-left w-28">Discrepancia</th>
              <th className="px-3 py-2 text-left w-32">Zona</th>
              <th className="px-3 py-2 text-right w-24">Costo unit.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
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
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{it.zonas?.nombre ?? '—'}</td>
                <td className="px-3 py-2 text-right text-xs">
                  {it.costo_unitario != null ? formatMXN(Number(it.costo_unitario)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-border border border-border rounded-lg">
        {items.map((it) => (
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
          </li>
        ))}
      </ul>

      {recepcion.notas && (
        <div className="mt-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notas</p>
          <p>{recepcion.notas}</p>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <CancelarRecepcionButton recepcionId={recepcion.id} estado={recepcion.estado} />
      </div>
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
