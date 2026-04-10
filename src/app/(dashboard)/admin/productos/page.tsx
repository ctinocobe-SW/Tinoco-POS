import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductoCard } from '@/components/productos/ProductoCard'
import { ImportarButton } from '@/components/productos/ImportarButton'

export const metadata = { title: 'Productos — POS TINOCO' }

interface PageProps {
  searchParams: { q?: string }
}

export default async function ProductosPage({ searchParams }: PageProps) {
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
    .from('productos')
    .select('id, sku, nombre, categoria, unidad_medida, precio_base, activo')
    .order('nombre', { ascending: true })

  if (q.length >= 2) {
    query = query.or(`nombre.ilike.%${q}%,sku.ilike.%${q}%`)
  }

  const { data: productos } = await query

  const lista = (productos ?? []) as {
    id: string
    sku: string
    nombre: string
    categoria: string | null
    unidad_medida: string
    precio_base: number
    activo: boolean
  }[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Productos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{lista.length} producto{lista.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <ImportarButton />
          <Link href="/admin/productos/nuevo">
            <Button>
              <Plus size={16} className="mr-1.5" />
              Nuevo producto
            </Button>
          </Link>
        </div>
      </div>

      {/* Búsqueda */}
      <form method="get" className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o SKU..."
          className="w-full max-w-sm bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
        />
      </form>

      {/* Lista */}
      {lista.length > 0 ? (
        <div className="space-y-2">
          {/* Encabezado */}
          <div className="flex items-center justify-between px-4 py-1 text-xs text-muted-foreground uppercase tracking-wide">
            <div className="flex items-center gap-4">
              <span className="w-16">SKU</span>
              <span>Nombre</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Unidad</span>
              <span className="w-24 text-right">Precio</span>
              <span className="w-16">Estado</span>
            </div>
          </div>
          {lista.map((p) => (
            <ProductoCard key={p.id} producto={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {q ? (
            <p>Sin resultados para &quot;{q}&quot;</p>
          ) : (
            <p>No hay productos registrados</p>
          )}
        </div>
      )}
    </div>
  )
}
