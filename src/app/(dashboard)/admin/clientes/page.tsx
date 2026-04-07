import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClienteCard } from '@/components/clientes/ClienteCard'

export const metadata = { title: 'Clientes — POS TINOCO' }

interface PageProps {
  searchParams: { q?: string }
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const q = searchParams.q?.trim() ?? ''

  let query = supabase
    .from('clientes')
    .select('id, nombre, rfc, telefono, credito_habilitado, activo')
    .order('nombre', { ascending: true })

  if (q.length >= 2) {
    query = query.or(`nombre.ilike.%${q}%,rfc.ilike.%${q}%`)
  }

  const { data: clientes } = await query

  const lista = (clientes ?? []) as {
    id: string
    nombre: string
    rfc: string | null
    telefono: string | null
    credito_habilitado: boolean
    activo: boolean
  }[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{lista.length} cliente{lista.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/clientes/nuevo">
          <Button>
            <Plus size={16} className="mr-1.5" />
            Nuevo cliente
          </Button>
        </Link>
      </div>

      {/* Búsqueda */}
      <form method="get" className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o RFC..."
          className="w-full max-w-sm bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
        />
      </form>

      {/* Lista */}
      {lista.length > 0 ? (
        <div className="space-y-2">
          {lista.map((c) => (
            <ClienteCard key={c.id} cliente={c} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {q ? (
            <p>Sin resultados para &quot;{q}&quot;</p>
          ) : (
            <p>No hay clientes registrados</p>
          )}
        </div>
      )}
    </div>
  )
}
