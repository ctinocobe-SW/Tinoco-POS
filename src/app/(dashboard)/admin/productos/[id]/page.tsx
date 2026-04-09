import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProductoForm } from '@/components/productos/ProductoForm'
import { ToggleActivoButton } from '@/components/productos/ToggleActivoButton'
import { formatMXN, formatDate } from '@/lib/utils/format'

export const metadata = { title: 'Producto — POS TINOCO' }

interface PageProps {
  params: { id: string }
}

export default async function ProductoDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const { data: producto } = await supabase
    .from('productos')
    .select('id, sku, nombre, descripcion, categoria, unidad_medida, peso_kg, precio_base, costo, tasa_iva, tasa_ieps, requiere_caducidad, codigo_barras, activo, created_at, updated_at')
    .eq('id', params.id)
    .single()

  if (!producto) notFound()

  const p = producto as any

  return (
    <div>
      <Link
        href="/admin/productos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={14} />
        Volver a productos
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-semibold">{p.nombre}</h1>
            <Badge variant={p.activo ? 'success' : 'warning'}>
              {p.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">{p.sku}</p>
        </div>
        <ToggleActivoButton productoId={p.id} activo={p.activo} />
      </div>

      {/* Info rápida */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Precio base</p>
          <p className="text-xl font-semibold mt-1">{formatMXN(Number(p.precio_base))}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Costo</p>
          <p className="text-xl font-semibold mt-1">{formatMXN(Number(p.costo))}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Categoría</p>
          <p className="text-xl font-semibold mt-1">{p.categoria ?? '—'}</p>
        </div>
      </div>

      {/* Formulario de edición */}
      <h2 className="text-lg font-medium mb-4">Editar producto</h2>
      <ProductoForm
        productoId={p.id}
        defaultValues={{
          nombre: p.nombre,
          descripcion: p.descripcion ?? '',
          categoria: p.categoria ?? 'Otros',
          peso_kg: Number(p.peso_kg),
          precio_base: Number(p.precio_base),
          costo: Number(p.costo),
          tasa_iva: Number(p.tasa_iva),
          tasa_ieps: Number(p.tasa_ieps),
          requiere_caducidad: p.requiere_caducidad,
          codigo_barras: p.codigo_barras ?? '',
        }}
      />

      <p className="text-xs text-muted-foreground mt-6">
        Creado el {formatDate(p.created_at)} · Última actualización {formatDate(p.updated_at)}
      </p>
    </div>
  )
}
