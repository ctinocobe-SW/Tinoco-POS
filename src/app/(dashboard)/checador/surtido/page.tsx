import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListasSurtidoVerificacionSection, type ListaSurtidoData } from '@/components/surtido/ListasSurtidoVerificacionSection'

export const metadata = { title: 'Surtido — POS TINOCO' }

export default async function CheckadorSurtidoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (profile as any)?.rol
  if (!rol || !['admin', 'checador', 'cajero'].includes(rol)) redirect('/')

  const { data: listasSurtido } = await supabase
    .from('listas_surtido')
    .select(`
      id, estado, notas, created_at,
      almacen_destino:almacenes!listas_surtido_almacen_destino_id_fkey(nombre),
      lista_surtido_items(
        id, producto_id, cantidad, almacen_origen_item_id,
        checado_checador, entregado,
        productos(nombre, sku, unidad_inventario_principal),
        almacen_origen:almacenes!lista_surtido_items_almacen_origen_item_id_fkey(nombre)
      )
    `)
    .in('estado', ['confirmada', 'en_transito', 'entregada'])
    .order('created_at', { ascending: false })
    .limit(50)

  const listasSurtidoData: ListaSurtidoData[] = (listasSurtido ?? []).map((l: any) => ({
    id: l.id,
    estado: l.estado,
    almacen_destino_nombre: l.almacen_destino?.nombre ?? '—',
    notas: l.notas ?? null,
    created_at: l.created_at,
    items: (l.lista_surtido_items ?? []).map((i: any) => ({
      id: i.id,
      producto_id: i.producto_id,
      producto_nombre: i.productos?.nombre ?? '—',
      producto_sku: i.productos?.sku ?? '—',
      cantidad: Number(i.cantidad),
      unidad: i.productos?.unidad_inventario_principal ?? null,
      almacen_origen_nombre: i.almacen_origen?.nombre ?? null,
      checado_checador: !!i.checado_checador,
      entregado: !!i.entregado,
    })),
  }))

  const checadorRol = rol === 'cajero' ? 'checador' : rol as 'admin' | 'checador'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-heading font-semibold">Verificación de surtido</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Confirma que los productos llegaron de la bodega. Al verificar todos los items se actualiza el inventario en El Mercader.
        </p>
      </div>
      <ListasSurtidoVerificacionSection listas={listasSurtidoData} rol={checadorRol} />
    </div>
  )
}
