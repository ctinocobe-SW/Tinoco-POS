import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMXN, formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import type { TicketEstado } from '@/types/database.types'

export const metadata = { title: 'Surtido — POS TINOCO' }

const ESTADO_LABELS: Partial<Record<TicketEstado, string>> = {
  verificado: 'Verificado',
  con_incidencias: 'Con incidencias',
  despachado: 'Despachado',
}

const ESTADO_VARIANTS: Partial<Record<TicketEstado, 'success' | 'warning' | 'default'>> = {
  verificado: 'success',
  con_incidencias: 'warning',
  despachado: 'default',
}

export default async function AdminSurtidoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.rol !== 'admin') redirect('/')

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, folio, estado, total, created_at, verificado_at, despachado_at,
      clientes(nombre),
      almacenes(nombre),
      profiles!tickets_despachador_id_fkey(nombre)
    `)
    .in('estado', ['verificado', 'con_incidencias', 'despachado'])
    .order('created_at', { ascending: false })
    .limit(100)

  // Conteo de items
  const ticketIds = (tickets ?? []).map((t: any) => t.id)
  const { data: itemCounts } = ticketIds.length > 0
    ? await supabase
        .from('ticket_items')
        .select('ticket_id')
        .in('ticket_id', ticketIds)
    : { data: [] }

  const countMap = new Map<string, number>()
  for (const item of (itemCounts ?? []) as any[]) {
    countMap.set(item.ticket_id, (countMap.get(item.ticket_id) ?? 0) + 1)
  }

  const lista = (tickets ?? []).map((t: any) => ({
    id: t.id,
    folio: t.folio,
    estado: t.estado as TicketEstado,
    total: Number(t.total),
    created_at: t.created_at as string,
    verificado_at: t.verificado_at as string | null,
    despachado_at: t.despachado_at as string | null,
    cliente_nombre: t.clientes?.nombre ?? null,
    almacen_nombre: t.almacenes?.nombre ?? null,
    despachador_nombre: t.profiles?.nombre ?? null,
    total_items: countMap.get(t.id) ?? 0,
  }))

  const pendientes = lista.filter((t) => t.estado !== 'despachado').length
  const despachados = lista.filter((t) => t.estado === 'despachado').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold">Surtido</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {pendientes} por despachar · {despachados} despachado{despachados !== 1 ? 's' : ''}
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
                <th className="px-4 py-2.5 text-left">Almacén</th>
                <th className="px-4 py-2.5 text-left">Despachador</th>
                <th className="px-4 py-2.5 text-center w-32">Estado</th>
                <th className="px-4 py-2.5 text-right w-28">Total</th>
                <th className="px-4 py-2.5 text-left w-32">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-brand-surface/50">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{t.folio}</td>
                  <td className="px-4 py-3">{t.cliente_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.almacen_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.despachador_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={ESTADO_VARIANTS[t.estado] ?? 'default'}>
                      {ESTADO_LABELS[t.estado] ?? t.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatMXN(t.total)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {t.despachado_at
                      ? formatDate(t.despachado_at)
                      : t.verificado_at
                      ? formatDate(t.verificado_at)
                      : formatDate(t.created_at)}
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
