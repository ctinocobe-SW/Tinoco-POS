import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfigTabs } from '@/components/configuracion/ConfigTabs'
import type { AlmacenTipo } from '@/types/database.types'

export const metadata = { title: 'Configuración — POS TINOCO' }

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const [
    { data: almacenes },
    { data: proveedores },
    { data: usuarios },
    { data: productos },
    { data: zonas },
  ] = await Promise.all([
    supabase
      .from('almacenes')
      .select('id, nombre, ubicacion, tipo, activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('proveedores')
      .select('id, nombre, razon_social, rfc, contacto, telefono, email, activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, nombre, email, rol, activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('productos')
      .select('id, sku, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true }),
    supabase
      .from('zonas')
      .select('id, nombre, almacen_id, despachador_id, activo, almacenes(nombre), profiles(nombre)')
      .order('nombre', { ascending: true }),
  ])

  const almacenesList = (almacenes ?? []).map((a: any) => ({
    id: a.id as string,
    nombre: a.nombre as string,
    ubicacion: a.ubicacion as string | null,
    tipo: a.tipo as AlmacenTipo,
    activo: a.activo as boolean,
  }))

  const proveedoresList = (proveedores ?? []).map((p: any) => ({
    id: p.id as string,
    nombre: p.nombre as string,
    razon_social: p.razon_social as string | null,
    rfc: p.rfc as string | null,
    contacto: p.contacto as string | null,
    telefono: p.telefono as string | null,
    email: p.email as string | null,
    activo: p.activo as boolean,
  }))

  const usuariosList = (usuarios ?? []).map((u: any) => ({
    id: u.id as string,
    nombre: u.nombre as string,
    email: u.email as string,
    rol: u.rol as 'admin' | 'despachador' | 'checador' | 'cajero',
    activo: u.activo as boolean,
  }))

  const productosList = (productos ?? []).map((p: any) => ({
    id: p.id as string,
    sku: p.sku as string,
    nombre: p.nombre as string,
  }))

  const zonasList = (zonas ?? []).map((z: any) => ({
    id: z.id as string,
    nombre: z.nombre as string,
    almacen_id: z.almacen_id as string,
    almacen_nombre: (z.almacenes?.nombre ?? '—') as string,
    despachador_id: z.despachador_id as string | null,
    despachador_nombre: (z.profiles?.nombre ?? null) as string | null,
    activo: z.activo as boolean,
  }))

  const despachadores = (usuarios ?? [])
    .filter((u: any) => u.rol === 'despachador' && u.activo)
    .map((u: any) => ({ id: u.id as string, nombre: u.nombre as string }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestión de almacenes, proveedores, usuarios y zonas
        </p>
      </div>

      <ConfigTabs
        almacenes={almacenesList}
        proveedores={proveedoresList}
        usuarios={usuariosList}
        productos={productosList}
        zonas={zonasList}
        despachadores={despachadores}
      />
    </div>
  )
}
