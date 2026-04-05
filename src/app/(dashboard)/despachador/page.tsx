import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Despacho — POS TINOCO' }

export default async function DespachadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'despachador'].includes(profile.rol)) redirect('/')

  const { data: misTickets } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at, clientes(nombre)')
    .eq('despachador_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-brand-gold">Despacho</h1>
          <p className="text-muted-foreground text-sm mt-1">Mis tickets recientes</p>
        </div>
        <Link
          href="/despachador/tickets/nuevo"
          className="bg-brand-gold text-brand-obsidiana px-4 py-2 rounded-md text-sm font-semibold hover:bg-brand-gold-light transition-colors"
        >
          + Nuevo Ticket
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-brand-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Folio</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {misTickets && misTickets.length > 0 ? (
              misTickets.map((t: any) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-brand-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-brand-gold">{t.folio}</td>
                  <td className="px-4 py-3">{t.clientes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={t.estado} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${Number(t.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Sin tickets aún. ¡Crea el primero!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    borrador: 'bg-muted text-muted-foreground',
    pendiente_aprobacion: 'bg-yellow-900/50 text-yellow-400',
    aprobado: 'bg-green-900/50 text-green-400',
    rechazado: 'bg-red-900/50 text-red-400',
    verificado: 'bg-blue-900/50 text-blue-400',
    despachado: 'bg-purple-900/50 text-purple-400',
    cerrado: 'bg-brand-muted text-muted-foreground',
  }
  const cls = map[estado] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>
      {estado.replace(/_/g, ' ')}
    </span>
  )
}
