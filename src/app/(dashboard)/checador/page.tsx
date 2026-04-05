import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Verificacion - POS TINOCO' }

export default async function ChecadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = (data as any)?.rol
  if (!rol || !['admin', 'checador'].includes(rol)) redirect('/')

  const { data: ticketsPendientes } = await supabase
    .from('tickets')
    .select('id, folio, estado, created_at')
    .in('estado', ['aprobado', 'en_verificacion'])
    .order('created_at', { ascending: true })

  return (
    <div>
      <h1>Cola de Verificacion</h1>
      <p>{ticketsPendientes?.length ?? 0} pedidos por verificar</p>
      <div>
        {ticketsPendientes && ticketsPendientes.length > 0 ? (
          ticketsPendientes.map((t: any) => (
            <Link key={t.id} href={`/checador/verificar/${t.id}`}>
              <div style={{ border: '1px solid #3A3A50', padding: '16px', marginBottom: '8px', borderRadius: '8px' }}>
                <p>{t.folio}</p>
                <p>{t.estado}</p>
              </div>
            </Link>
          ))
        ) : (
          <p>Cola vacia</p>
        )}
      </div>
    </div>
  )
}
