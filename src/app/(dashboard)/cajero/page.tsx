import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketCard } from '@/components/tickets/TicketCard'
import { formatMXN } from '@/lib/utils/format'
import { ShoppingCart, CheckSquare, Clock } from 'lucide-react'

export const metadata = { title: 'Caja — POS TINOCO' }

export default async function CajaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre')
    .eq('id', user.id)
    .single()

  const rol = (profile as any)?.rol
  if (!rol || !['admin', 'cajero'].includes(rol)) redirect('/')

  // Tickets despachados listos para cobrar
  const { data: listosCobrar } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at, clientes(nombre)')
    .eq('estado', 'despachado')
    .order('created_at', { ascending: true })

  // Tickets recién cerrados (cobrados hoy)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const { data: cobradosHoy } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at, clientes(nombre)')
    .in('estado', ['facturado', 'cerrado'])
    .gte('created_at', hoy.toISOString())
    .order('created_at', { ascending: false })

  const listos = (listosCobrar ?? []).map((t: any) => ({
    id: t.id as string,
    folio: t.folio as string,
    estado: t.estado,
    total: Number(t.total),
    created_at: t.created_at as string,
    cliente_nombre: t.clientes?.nombre ?? undefined,
  }))

  const cobrados = (cobradosHoy ?? []).map((t: any) => ({
    id: t.id as string,
    folio: t.folio as string,
    estado: t.estado,
    total: Number(t.total),
    created_at: t.created_at as string,
    cliente_nombre: t.clientes?.nombre ?? undefined,
  }))

  const totalCobradoHoy = cobrados.reduce((sum, t) => sum + t.total, 0)

  return (
    <div>
      <h1 className="text-2xl font-heading font-semibold mb-1">Caja</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Pedidos despachados listos para cobrar
      </p>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Clock size={14} />
            Por cobrar
          </div>
          <p className="text-2xl font-semibold">{listos.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {listos.length === 1 ? 'pedido esperando' : 'pedidos esperando'}
          </p>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <CheckSquare size={14} />
            Cobrados hoy
          </div>
          <p className="text-2xl font-semibold">{cobrados.length}</p>
          <p className="text-xs text-muted-foreground mt-1">transacciones</p>
        </div>

        <div className="border border-border rounded-lg p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <ShoppingCart size={14} />
            Total del día
          </div>
          <p className="text-2xl font-semibold">{formatMXN(totalCobradoHoy)}</p>
          <p className="text-xs text-muted-foreground mt-1">en ventas cerradas</p>
        </div>
      </div>

      {/* Cola de cobro */}
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Listos para cobrar
      </h2>

      {listos.length > 0 ? (
        <div className="space-y-3 mb-8">
          {listos.map((t) => (
            <TicketCard key={t.id} ticket={t} href={`/checador/verificar/${t.id}`} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg mb-8">
          <p className="text-sm">Sin pedidos por cobrar</p>
        </div>
      )}

      {/* Cobrados hoy */}
      {cobrados.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Cobrados hoy
          </h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Folio</th>
                  <th className="px-4 py-2.5 text-left">Cliente</th>
                  <th className="px-4 py-2.5 text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {cobrados.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-brand-surface/50">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{t.folio}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.cliente_nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMXN(t.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-brand-surface">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground" colSpan={2}>
                    {cobrados.length} transacción{cobrados.length !== 1 ? 'es' : ''}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatMXN(totalCobradoHoy)}</td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
