import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProductoForm } from '@/components/productos/ProductoForm'

export const metadata = { title: 'Nuevo Producto — POS TINOCO' }

export default async function NuevoProductoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const { data: almacenes } = await supabase
    .from('almacenes')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  return (
    <div>
      <Link
        href="/admin/productos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={14} />
        Volver a productos
      </Link>

      <h1 className="text-2xl font-heading font-semibold mb-6">Nuevo producto</h1>

      <ProductoForm almacenes={(almacenes ?? []) as { id: string; nombre: string }[]} />
    </div>
  )
}
