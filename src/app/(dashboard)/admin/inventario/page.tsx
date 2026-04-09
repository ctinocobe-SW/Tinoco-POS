import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { History } from 'lucide-react'
import { InventarioTable } from '@/components/inventario/InventarioTable'

export const metadata = { title: 'Inventario — POS TINOCO' }

export default async function InventarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  // Todos los productos activos
  const { data: productos } = await supabase
    .from('productos')
    .select('id, sku, nombre, categoria')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  // Todos los registros de inventario con info de almacén
  const { data: inventario } = await supabase
    .from('inventario')
    .select('id, producto_id, almacen_id, stock_actual, stock_minimo, almacenes(nombre)')

  // Almacenes activos para filtro y ajuste
  const { data: almacenes } = await supabase
    .from('almacenes')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  const almacenesList = (almacenes ?? []) as { id: string; nombre: string }[]

  // Construir mapa de inventario por producto
  type StockEntry = {
    inventario_id: string
    almacen_id: string
    almacen_nombre: string
    stock_actual: number
    stock_minimo: number
  }

  type ProductoRow = {
    producto_id: string
    producto_sku: string
    producto_nombre: string
    producto_categoria: string
    stock_total: number
    stock_entries: StockEntry[]
  }

  const productoMap = new Map<string, ProductoRow>()
  for (const p of (productos ?? []) as any[]) {
    productoMap.set(p.id, {
      producto_id: p.id,
      producto_sku: p.sku ?? '',
      producto_nombre: p.nombre,
      producto_categoria: p.categoria ?? 'Otros',
      stock_total: 0,
      stock_entries: [],
    })
  }

  for (const inv of (inventario ?? []) as any[]) {
    const p = productoMap.get(inv.producto_id)
    if (!p) continue
    const stock = Number(inv.stock_actual)
    p.stock_entries.push({
      inventario_id: inv.id,
      almacen_id: inv.almacen_id,
      almacen_nombre: inv.almacenes?.nombre ?? '',
      stock_actual: stock,
      stock_minimo: Number(inv.stock_minimo),
    })
    p.stock_total += stock
  }

  const rows = Array.from(productoMap.values())

  const totalProductos = rows.length
  const sinStock = rows.filter((r) => r.stock_total === 0).length
  const bajosMinimo = rows.filter((r) =>
    r.stock_entries.some((e) => e.stock_actual < e.stock_minimo && e.stock_minimo > 0)
  ).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalProductos} producto{totalProductos !== 1 ? 's' : ''}
            {sinStock > 0 && ` · ${sinStock} sin stock`}
            {bajosMinimo > 0 && ` · ${bajosMinimo} bajo mínimo`}
          </p>
        </div>
        <Link
          href="/admin/inventario/movimientos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 transition-colors"
        >
          <History size={14} />
          Ver movimientos
        </Link>
      </div>

      <InventarioTable rows={rows} almacenes={almacenesList} />
    </div>
  )
}
