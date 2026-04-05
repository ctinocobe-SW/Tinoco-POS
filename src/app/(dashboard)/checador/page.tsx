import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Verificación — POS TINOCO' }

export default async function ChecadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'checador'].includes(profile.rol)) redirect('/')

  const { data: ticketsPendientes } = await supabase
    .from('tickets')
    .select('id, folio, estado, created_at, clientes(nombre), profiles!tickets_despachador_id_fkey(nombre)')
    .in('estado', ['aprobado', 'en_verificacion'])
    .order('aprobado_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-brand-gold">Cola de Verificación</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ticketsPendientes?.length ?? 0} pedido(s) por verificar
        </p>
      </div>

      <div className="space-y-3">
        {ticketsPendientes && ticketsPendientes.length > 0 ? (
          ticketsPendientes.map((t: any) => (
            <Link
              key={t.id}
              href={`/checador/verificar/${t.id}`}
              className="block rounded-lg border border-border bg-brand-surface p-4 hover:border-brand-gold/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-brand-gold font-semibold">{t.folio}</span>
                  <span className="text-muted-foreground mx-2">·</span>
                  <span>{t.clientes?.nombre}</span>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-brand-gold transition-colors">
                  Verificar →
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Despachador: {t.profiles?.nombre ?? '—'}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-brand-surface p-12 text-center text-muted-foreground">
            <p className="font-heading text-lg">Cola vacía</p>
            <p className="text-sm mt-1">No hay pedidos aprobados pendientes de verificación</p>
          </div>
        )}
      </div>
    </div>
  )
}
