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

  const [{ data: producto }, { data: proveedores }, { data: ppRows }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, sku, nombre, descripcion, categoria, peso_kg, precio_base, precio_mayoreo, costo, tasa_iva, tasa_ieps, vende_pza, vende_kg, vende_caja, vende_bulto, piezas_por_caja, piezas_por_bulto, requiere_caducidad, fecha_caducidad, activo, created_at, updated_at')
      .eq('id', params.id)
      .single(),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre', { ascending: true }),
    supabase.from('producto_proveedor').select('proveedor_id').eq('producto_id', params.id),
  ])

  if (!producto) notFound()

  const proveedoresIniciales = (ppRows ?? []).map((r: any) => r.proveedor_id as string)

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
        proveedores={(proveedores ?? []) as { id: string; nombre: string }[]}
        proveedoresIniciales={proveedoresIniciales}
        defaultValues={{
          nombre: p.nombre,
          descripcion: p.descripcion ?? '',
          categoria: p.categoria ?? 'Otros',
          peso_kg: Number(p.peso_kg),
          precio_base: Number(p.precio_base),
          precio_mayoreo: Number(p.precio_mayoreo ?? 0),
          costo: Number(p.costo),
          tasa_iva: Number(p.tasa_iva),
          tasa_ieps: Number(p.tasa_ieps),
          vende_pza: p.vende_pza ?? false,
          vende_kg: p.vende_kg ?? false,
          vende_caja: p.vende_caja ?? false,
          vende_bulto: p.vende_bulto ?? false,
          piezas_por_caja: p.piezas_por_caja ? Number(p.piezas_por_caja) : undefined,
          piezas_por_bulto: p.piezas_por_bulto ? Number(p.piezas_por_bulto) : undefined,
          requiere_caducidad: p.requiere_caducidad,
          fecha_caducidad: p.fecha_caducidad ?? undefined,
        }}
      />

      <p className="text-xs text-muted-foreground mt-6">
        Creado el {formatDate(p.created_at)} · Última actualización {formatDate(p.updated_at)}
      </p>
    </div>
  )
}
