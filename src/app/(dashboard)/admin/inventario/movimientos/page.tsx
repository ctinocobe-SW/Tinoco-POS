import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Movimientos de Inventario — POS TINOCO' }

const TIPO_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  traspaso: 'Traspaso',
  merma: 'Merma',
  ajuste: 'Ajuste',
}

const TIPO_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  entrada: 'success',
  salida: 'warning',
  merma: 'error',
  ajuste: 'default',
  traspaso: 'default',
}

export default async function MovimientosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const { data: movimientos } = await supabase
    .from('movimientos_inventario')
    .select(`
      id,
      tipo,
      cantidad,
      referencia_tipo,
      referencia_id,
      notas,
      created_at,
      productos(sku, nombre),
      almacenes(nombre),
      profiles(nombre)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const lista = (movimientos ?? []).map((m: any) => ({
    id: m.id,
    tipo: m.tipo as string,
    cantidad: Number(m.cantidad),
    referencia_tipo: m.referencia_tipo as string | null,
    notas: m.notas as string | null,
    created_at: m.created_at as string,
    producto_sku: m.productos?.sku ?? '',
    producto_nombre: m.productos?.nombre ?? '',
    almacen_nombre: m.almacenes?.nombre ?? '',
    usuario_nombre: m.profiles?.nombre ?? '',
  }))

  return (
    <div>
      <Link
        href="/admin/inventario"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={14} />
        Volver a inventario
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold">Movimientos de inventario</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Últimos {lista.length} movimientos
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-border rounded-lg">
          <p>No hay movimientos registrados.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Fecha</th>
                <th className="px-4 py-2.5 text-left">Producto</th>
                <th className="px-4 py-2.5 text-left">Almacén</th>
                <th className="px-4 py-2.5 text-center w-24">Tipo</th>
                <th className="px-4 py-2.5 text-right w-24">Cantidad</th>
                <th className="px-4 py-2.5 text-left">Referencia</th>
                <th className="px-4 py-2.5 text-left">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-brand-surface/50">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(m.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.producto_nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">{m.producto_sku}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.almacen_nombre}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={TIPO_VARIANTS[m.tipo] ?? 'default'}>
                      {TIPO_LABELS[m.tipo] ?? m.tipo}
                    </Badge>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium tabular-nums ${
                    m.tipo === 'salida' || m.tipo === 'merma' ? 'text-red-600' : 'text-green-700'
                  }`}>
                    {m.tipo === 'salida' || m.tipo === 'merma' ? '-' : '+'}{m.cantidad % 1 === 0 ? m.cantidad : m.cantidad.toFixed(3).replace(/0+$/, '')}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {m.referencia_tipo === 'recepcion' ? 'Recepción' :
                     m.referencia_tipo === 'ajuste_manual' ? (m.notas ?? 'Ajuste manual') :
                     m.referencia_tipo ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {m.usuario_nombre || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
