import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { listarAlertasReorden } from '@/lib/actions/alertasReorden'
import { AlertasReordenTable } from '@/components/inventario/AlertasReordenTable'

export const metadata = { title: 'Alertas de reorden — POS TINOCO' }

export default async function AlertasReordenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const { data: alertas, error } = await listarAlertasReorden()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/inventario"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft size={12} />
            Inventario
          </Link>
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <h1 className="text-2xl font-heading font-semibold">Alertas de reorden</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Productos en bodegas por debajo del mínimo. Avisa al proveedor por WhatsApp.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 mb-4">{error}</div>
      )}

      <AlertasReordenTable alertas={alertas ?? []} />
    </div>
  )
}
