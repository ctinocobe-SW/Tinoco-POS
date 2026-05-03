import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RecepcionForm } from '@/components/recepciones/RecepcionForm'

export const metadata = { title: 'Nueva recepción — POS TINOCO' }

export default async function AdminNuevaRecepcionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const [almacenesRes, zonasRes, despachadoresRes] = await Promise.all([
    supabase.from('almacenes').select('id, nombre, tipo').eq('activo', true).order('nombre'),
    supabase.from('zonas').select('id, nombre, almacen_id, profiles(nombre)').eq('activo', true).order('nombre'),
    supabase.from('profiles').select('id, nombre').eq('rol', 'despachador').eq('activo', true).order('nombre'),
  ])

  const almacenes = (almacenesRes.data ?? []) as { id: string; nombre: string; tipo: string }[]
  const zonas = (zonasRes.data ?? []).map((z: any) => ({
    id: z.id as string,
    nombre: z.nombre as string,
    almacen_id: z.almacen_id as string,
    despachador_nombre: (z.profiles?.nombre ?? null) as string | null,
  }))
  const despachadores = (despachadoresRes.data ?? []) as { id: string; nombre: string }[]

  if (almacenes.length === 0) {
    return (
      <div>
        <Link href="/admin/recepciones" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={14} />
          Volver
        </Link>
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay almacenes configurados.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href="/admin/recepciones" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={14} />
        Volver a recepciones
      </Link>

      <h1 className="text-2xl font-heading font-semibold mb-2">Nueva recepción</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Captura los productos que están entrando con la factura del proveedor. Las cantidades que ingreses son las que se aplicarán al inventario al cerrar.
      </p>

      <RecepcionForm
        almacenes={almacenes}
        zonas={zonas}
        despachadores={despachadores}
        cancelHref="/admin/recepciones"
      />
    </div>
  )
}
