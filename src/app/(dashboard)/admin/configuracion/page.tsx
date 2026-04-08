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

  const [{ data: almacenes }, { data: proveedores }] = await Promise.all([
    supabase
      .from('almacenes')
      .select('id, nombre, ubicacion, tipo, activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('proveedores')
      .select('id, nombre, razon_social, rfc, contacto, telefono, email, activo')
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestión de almacenes y proveedores
        </p>
      </div>

      <ConfigTabs almacenes={almacenesList} proveedores={proveedoresList} />
    </div>
  )
}
