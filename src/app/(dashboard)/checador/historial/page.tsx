import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge'
import { formatMXN, formatDate } from '@/lib/utils/format'
import type { TicketEstado } from '@/types/database.types'

export const metadata = { title: 'Historial — POS TINOCO' }

export default async function CheckadorHistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (profile as any)?.rol
  if (!rol || !['admin', 'checador'].includes(rol)) redirect('/')

  // El checador ve solo sus tickets verificados; el admin ve todos
  let query = supabase
    .from('tickets')
    .select('id, folio, estado, total, verificado_at, despachado_at, clientes(nombre)')
    .in('estado', ['verificado', 'con_incidencias', 'despachado', 'facturado', 'cerrado'])
    .order('verificado_at', { ascending: false })
    .limit(100)

  if (rol === 'checador') {
    query = query.eq('checador_id', user.id)
  }

  const { data: tickets } = await query

  const lista = (tickets ?? []).map((t: any) => ({
    id: t.id as string,
    folio: t.folio as string,
    estado: t.estado as TicketEstado,
    total: Number(t.total),
    verificado_at: t.verificado_at as string | null,
    despachado_at: t.despachado_at as string | null,
    cliente_nombre: t.clientes?.nombre as string | null,
  }))

  return (
    <div>
      <Link
        href="/checador"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={14} />
        Volver a la cola
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold">Historial</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {lista.length} ticket{lista.length !== 1 ? 's' : ''} verificado{lista.length !== 1 ? 's' : ''}
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-border rounded-lg">
          <p>No hay tickets verificados aún.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Folio</th>
                <th className="px-4 py-2.5 text-left">Cliente</th>
                <th className="px-4 py-2.5 text-center w-36">Estado</th>
                <th className="px-4 py-2.5 text-right w-28">Total</th>
                <th className="px-4 py-2.5 text-left w-36">Verificado</th>
                <th className="px-4 py-2.5 text-left w-36">Despachado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-brand-surface/50">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{t.folio}</td>
                  <td className="px-4 py-3">{t.cliente_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <TicketStatusBadge estado={t.estado} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatMXN(t.total)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {t.verificado_at ? formatDate(t.verificado_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {t.despachado_at ? formatDate(t.despachado_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
