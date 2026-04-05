import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Despacho - POS TINOCO' }

export default async function DespachadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (data as any)?.rol
  if (!rol || !['admin', 'despachador'].includes(rol)) redirect('/')

  const { data: misTickets } = await supabase
    .from('tickets')
    .select('id, folio, estado, total, created_at')
    .eq('despachador_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div>
      <h1>Despacho</h1>
      <Link href="/despachador/tickets/nuevo">
        <button>Nuevo Ticket</button>
      </Link>
      <div>
        {misTickets && misTickets.length > 0 ? (
          misTickets.map((t: any) => (
            <div key={t.id} style={{ border: '1px solid #3A3A50', padding: '16px', marginBottom: '8px', borderRadius: '8px' }}>
              <p>{t.folio}</p>
              <p>{t.estado}</p>
              <p>${Number(t.total).toFixed(2)}</p>
            </div>
          ))
        ) : (
          <p>Sin tickets aun</p>
        )}
      </div>
    </div>
  )
}
