import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMXN } from '@/lib/utils/format'
import { VentasPorDiaChart } from '@/components/analitica/VentasPorDiaChart'
import { TopProductosChart } from '@/components/analitica/TopProductosChart'
import { TrendingUp, Package, AlertTriangle, ShoppingCart } from 'lucide-react'

export const metadata = { title: 'Analítica — POS TINOCO' }

export default async function AnaliticaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  // Rango: últimos 30 días
  const hace30 = new Date()
  hace30.setDate(hace30.getDate() - 30)
  const desde = hace30.toISOString().split('T')[0]

  // Tickets de los últimos 30 días (estados que representan ventas reales)
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, total, created_at, estado')
    .gte('created_at', hace30.toISOString())
    .in('estado', ['aprobado', 'en_verificacion', 'verificado', 'con_incidencias', 'despachado', 'facturado', 'cerrado'])
    .order('created_at', { ascending: true })

  const ticketsList = (tickets ?? []) as any[]

  // Agrupar ventas por día
  const ventasPorDiaMap = new Map<string, { total: number; tickets: number }>()
  for (const t of ticketsList) {
    const dia = (t.created_at as string).split('T')[0]
    const prev = ventasPorDiaMap.get(dia) ?? { total: 0, tickets: 0 }
    ventasPorDiaMap.set(dia, {
      total: prev.total + Number(t.total),
      tickets: prev.tickets + 1,
    })
  }

  // Rellenar días sin ventas en el rango
  const ventasPorDia: { fecha: string; total: number; tickets: number }[] = []
  const cur = new Date(hace30)
  const hoy = new Date()
  while (cur <= hoy) {
    const key = cur.toISOString().split('T')[0]
    const v = ventasPorDiaMap.get(key) ?? { total: 0, tickets: 0 }
    const label = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(cur)
    ventasPorDia.push({ fecha: label, total: v.total, tickets: v.tickets })
    cur.setDate(cur.getDate() + 1)
  }

  // KPIs del mes actual
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)

  const ticketsMes = ticketsList.filter((t) => new Date(t.created_at) >= inicioMes)
  const totalMes = ticketsMes.reduce((sum, t) => sum + Number(t.total), 0)
  const totalPeriodo = ticketsList.reduce((sum, t) => sum + Number(t.total), 0)

  // Top productos (últimos 30 días)
  const ticketIds = ticketsList.map((t) => t.id)
  let topProductos: { nombre: string; sku: string; cantidad: number; total: number }[] = []

  if (ticketIds.length > 0) {
    const { data: items } = await supabase
      .from('ticket_items')
      .select('cantidad, subtotal, productos(sku, nombre)')
      .in('ticket_id', ticketIds)

    const productoMap = new Map<string, { nombre: string; sku: string; cantidad: number; total: number }>()
    for (const item of (items ?? []) as any[]) {
      const sku = item.productos?.sku ?? 'N/A'
      const nombre = item.productos?.nombre ?? 'Sin nombre'
      const prev = productoMap.get(sku) ?? { nombre, sku, cantidad: 0, total: 0 }
      productoMap.set(sku, {
        nombre,
        sku,
        cantidad: prev.cantidad + Number(item.cantidad),
        total: prev.total + Number(item.subtotal),
      })
    }

    topProductos = Array.from(productoMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8)
  }

  // Inventario bajo mínimo
  const { data: invBajo } = await supabase
    .from('inventario')
    .select('id, stock_actual, stock_minimo, productos(nombre), almacenes(nombre)')
    .filter('stock_actual', 'lt', 'stock_minimo')

  // Necesitamos filtrar por JS porque Supabase no permite comparar dos columnas directamente con filter
  const { data: invTodo } = await supabase
    .from('inventario')
    .select('id, stock_actual, stock_minimo, productos(nombre), almacenes(nombre)')

  const bajosMinimo = (invTodo ?? []).filter((r: any) => Number(r.stock_actual) < Number(r.stock_minimo)) as any[]

  // Total productos en inventario
  const { count: totalProductos } = await supabase
    .from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)

  return (
    <div>
      <h1 className="text-2xl font-heading font-semibold mb-6">Analítica</h1>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <TrendingUp size={14} />
            Ventas este mes
          </div>
          <p className="text-2xl font-semibold">{formatMXN(totalMes)}</p>
          <p className="text-xs text-muted-foreground mt-1">{ticketsMes.length} ticket{ticketsMes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <ShoppingCart size={14} />
            Ventas 30 días
          </div>
          <p className="text-2xl font-semibold">{formatMXN(totalPeriodo)}</p>
          <p className="text-xs text-muted-foreground mt-1">{ticketsList.length} ticket{ticketsList.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Package size={14} />
            Productos activos
          </div>
          <p className="text-2xl font-semibold">{totalProductos ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">en catálogo</p>
        </div>
        <div className={`border rounded-lg p-4 ${bajosMinimo.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-border'}`}>
          <div className={`flex items-center gap-2 text-sm mb-2 ${bajosMinimo.length > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
            <AlertTriangle size={14} />
            Bajo mínimo
          </div>
          <p className={`text-2xl font-semibold ${bajosMinimo.length > 0 ? 'text-amber-700' : ''}`}>{bajosMinimo.length}</p>
          <p className={`text-xs mt-1 ${bajosMinimo.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {bajosMinimo.length > 0 ? 'producto(s) requieren atención' : 'inventario en orden'}
          </p>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        {/* Ventas por día */}
        <div className="col-span-3 border border-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">Ventas por día — últimos 30 días</h2>
          <VentasPorDiaChart data={ventasPorDia} />
        </div>

        {/* Top productos */}
        <div className="col-span-2 border border-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">Top productos (por unidades)</h2>
          <TopProductosChart data={topProductos} />
        </div>
      </div>

      {/* Tabla: inventario bajo mínimo */}
      {bajosMinimo.length > 0 && (
        <div className="border border-amber-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <h2 className="text-sm font-medium text-amber-800">Productos bajo mínimo de stock</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-100 bg-amber-50/50 text-xs text-amber-700 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Producto</th>
                <th className="px-4 py-2 text-left">Almacén</th>
                <th className="px-4 py-2 text-right w-28">Stock actual</th>
                <th className="px-4 py-2 text-right w-28">Stock mínimo</th>
                <th className="px-4 py-2 text-right w-28">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {bajosMinimo.map((r: any) => (
                <tr key={r.id} className="border-b border-amber-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{r.productos?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.almacenes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">{Number(r.stock_actual)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{Number(r.stock_minimo)}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">
                    {Number(r.stock_actual) - Number(r.stock_minimo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
