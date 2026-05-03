import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EstadoBadge } from '@/components/recepciones/EstadoBadge'
import { formatDate } from '@/lib/utils/format'

export const metadata = { title: 'Mis recepciones — POS TINOCO' }

export default async function DespachadorRecepcionesPage() {
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

  // Despachador solo ve recepciones donde es responsable de acomodar.
  // RLS ya filtra esto, pero filtramos también acá explícitamente para claridad.
  const { data: recepciones } = await supabase
    .from('recepciones')
    .select(`
      id, fecha, estado, folio_factura,
      proveedores(nombre), almacenes(nombre, tipo),
      checador:profiles!recepciones_checador_fk(nombre)
    `)
    .eq('despachador_responsable_id', user.id)
    .order('created_at', { ascending: false })
    .limit(80)

  const lista = (recepciones ?? []) as any[]

  return (
    <div>
      <h1 className="text-2xl font-heading font-semibold mb-2">Mis recepciones</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Recepciones donde fuiste asignado como responsable de acomodar la mercancía.
        El checador captura las cantidades y el administrador cierra para aplicar al inventario.
      </p>

      {lista.length > 0 ? (
        <div className="space-y-2">
          {lista.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between border border-border rounded-lg px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium">{formatDate(r.fecha)}</p>
                  <EstadoBadge estado={r.estado} />
                  {r.folio_factura && (
                    <span className="text-xs font-mono text-muted-foreground">F: {r.folio_factura}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.proveedores?.nombre ?? 'Sin proveedor'}
                  {r.almacenes ? ` · ${r.almacenes.nombre}` : ''}
                  {r.checador?.nombre ? ` · Checador: ${r.checador.nombre}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No tienes recepciones asignadas</p>
          <p className="text-xs mt-1">El checador te asignará cuando llegue mercancía</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-8">
        Las recepciones de proveedor las captura el <Link href="/checador/recepciones" className="underline">checador</Link>.
      </p>
    </div>
  )
}
