import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClienteForm } from '@/components/clientes/ClienteForm'

export const metadata = { title: 'Nuevo Cliente — POS TINOCO' }

export default async function NuevoClientePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  return (
    <div>
      <Link
        href="/admin/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={14} />
        Volver a clientes
      </Link>

      <h1 className="text-2xl font-heading font-semibold mb-6">Nuevo cliente</h1>

      <ClienteForm />
    </div>
  )
}
