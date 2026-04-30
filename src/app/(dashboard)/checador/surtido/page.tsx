import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Truck, ClipboardList } from 'lucide-react'
import { ListasAlmacenSection } from '@/components/surtido/ListasAlmacenSection'
import { ListasSurtidoVerificacionSection, type ListaSurtidoData } from '@/components/surtido/ListasSurtidoVerificacionSection'
import type { ListaData } from '@/components/surtido/ListaDetalle'

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

  // Listas de almacén (checklist manual)
  const { data: listasAlmacen } = await supabase
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
    .limit(50)

  // Listas de surtido pendientes + recientes (para verificación del checador)
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
    .limit(30)

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

  const checadorRol = rol === 'cajero' ? 'checador' : rol as 'admin' | 'checador'

  return (
    <div className="space-y-8">
      {/* Sección 1: Listas de surtido (verificación de transferencias de bodega) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Truck size={16} className="text-muted-foreground" />
          <div>
            <h2 className="text-lg font-heading font-semibold">Verificación de surtido</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirma que los productos llegaron de la bodega. Al verificar todos los items se actualiza el inventario.
            </p>
          </div>
        </div>
        <ListasSurtidoVerificacionSection listas={listasSurtidoData} rol={checadorRol} />
      </div>

      {/* Separador */}
      <div className="border-t border-border" />

      {/* Sección 2: Listas de almacén (checklists manuales) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={16} className="text-muted-foreground" />
          <div>
            <h2 className="text-lg font-heading font-semibold">Listas de almacén</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Checklists manuales de productos para revisión física.
            </p>
          </div>
        </div>
        <ListasAlmacenSection listas={listasAlmacenData} rol={checadorRol} />
      </div>
    </div>
  )
}
