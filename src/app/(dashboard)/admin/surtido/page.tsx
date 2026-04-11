import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListasAlmacenSection } from '@/components/surtido/ListasAlmacenSection'
import type { ListaData } from '@/components/surtido/ListaDetalle'

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

  const { data: listas } = await supabase
    .from('listas_almacen')
    .select(`
      id, nombre, notas, estado, created_at,
      lista_almacen_items(
        id, cantidad, notas, checado,
        productos(nombre, sku, peso_kg)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const listasData: ListaData[] = (listas ?? []).map((l: any) => ({
    id: l.id,
    nombre: l.nombre,
    notas: l.notas ?? null,
    estado: l.estado,
    created_at: l.created_at,
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

  return <ListasAlmacenSection listas={listasData} rol="admin" />
}
