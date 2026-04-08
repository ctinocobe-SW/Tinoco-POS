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

  // Cargar inventario con joins a productos y almacenes
  const { data: inventario } = await supabase
    .from('inventario')
    .select(`
      id,
      producto_id,
      almacen_id,
      stock_actual,
      stock_minimo,
      productos(sku, nombre, unidad_medida),
      almacenes(nombre)
    `)
    .order('stock_actual', { ascending: true })

  const rows = (inventario ?? []).map((row: any) => ({
    inventario_id: row.id,
    producto_id: row.producto_id,
    producto_sku: row.productos?.sku ?? '',
    producto_nombre: row.productos?.nombre ?? '',
    producto_unidad: row.productos?.unidad_medida ?? '',
    almacen_id: row.almacen_id,
    almacen_nombre: row.almacenes?.nombre ?? '',
    stock_actual: Number(row.stock_actual),
    stock_minimo: Number(row.stock_minimo),
  }))

  // Cargar almacenes para filtro
  const { data: almacenes } = await supabase
    .from('almacenes')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  const almacenesList = (almacenes ?? []) as { id: string; nombre: string }[]

  const totalProductos = new Set(rows.map((r) => r.producto_id)).size
  const bajosMinimo = rows.filter((r) => r.stock_actual < r.stock_minimo).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalProductos} producto{totalProductos !== 1 ? 's' : ''} · {bajosMinimo > 0 ? `${bajosMinimo} bajo mínimo` : 'todo en orden'}
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

      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-border rounded-lg">
          <p>No hay registros de inventario.</p>
          <p className="text-xs mt-1">Confirma recepciones de mercancía para poblar el inventario.</p>
        </div>
      ) : (
        <InventarioTable rows={rows} almacenes={almacenesList} />
      )}
    </div>
  )
}
