import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Truck, ClipboardList } from 'lucide-react'
import { ListasAlmacenSection } from '@/components/surtido/ListasAlmacenSection'
import { ListasSurtidoGestionSection } from '@/components/surtido/ListasSurtidoGestionSection'
import type { ListaData } from '@/components/surtido/ListaDetalle'
import type { ListaSurtidoData } from '@/components/surtido/ListasSurtidoVerificacionSection'

export const metadata = { title: 'Surtido — POS TINOCO' }

export default async function AdminSurtidoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const [{ data: listasAlmacen }, { data: listasSurtido }] = await Promise.all([
    supabase
      .from('listas_almacen')
      .select(`
        id, nombre, notas, estado, created_at,
        almacenes(nombre),
        lista_almacen_items(
          id, cantidad, notas, checado,
          productos(nombre, sku, peso_kg)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
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
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const listasAlmacenData: ListaData[] = (listasAlmacen ?? []).map((l: any) => ({
    id: l.id,
    nombre: l.nombre,
    notas: l.notas ?? null,
    estado: l.estado,
    created_at: l.created_at,
    almacen_nombre: l.almacenes?.nombre ?? null,
    items: (l.lista_almacen_items ?? []).map((i: any) => ({
      id: i.id,
      cantidad: Number(i.cantidad),
      notas: i.notas ?? null,
      checado: i.checado ?? false,
      producto: {
        nombre: i.productos?.nombre ?? '—',
        sku: i.productos?.sku ?? '—',
        peso_kg: Number(i.productos?.peso_kg ?? 0),
      },
    })),
  }))

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

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Truck size={16} className="text-muted-foreground" />
          <div>
            <h2 className="text-lg font-heading font-semibold">Listas de surtido</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Transferencias de bodega a El Mercader. El checador verifica la recepción y se actualiza el inventario.
            </p>
          </div>
        </div>
        <ListasSurtidoGestionSection listas={listasSurtidoData} rol="admin" />
      </div>

      <div className="border-t border-border" />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={16} className="text-muted-foreground" />
          <div>
            <h2 className="text-lg font-heading font-semibold">Listas de almacén</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Checklists manuales de productos.</p>
          </div>
        </div>
        <ListasAlmacenSection listas={listasAlmacenData} rol="admin" />
      </div>
    </div>
  )
}
