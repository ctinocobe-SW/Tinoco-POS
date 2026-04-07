import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RecepcionForm } from '@/components/recepciones/RecepcionForm'

export const metadata = { title: 'Nueva Recepción — POS TINOCO' }

export default async function NuevaRecepcionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (profile as any)?.rol
  if (!rol || !['admin', 'despachador'].includes(rol)) redirect('/')

  // Cargar almacenes en el servidor y pasarlos al form
  const { data: almacenes } = await supabase
    .from('almacenes')
    .select('id, nombre, tipo')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  const almacenesList = (almacenes ?? []) as { id: string; nombre: string; tipo: string }[]

  if (almacenesList.length === 0) {
    return (
      <div>
        <Link
          href="/despachador/recepciones"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft size={14} />
          Volver a recepciones
        </Link>
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay almacenes activos configurados.</p>
          <p className="text-xs mt-1">Contacta al administrador.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/despachador/recepciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={14} />
        Volver a recepciones
      </Link>

      <h1 className="text-2xl font-heading font-semibold mb-6">Nueva recepción</h1>

      <RecepcionForm almacenes={almacenesList} />
    </div>
  )
}
