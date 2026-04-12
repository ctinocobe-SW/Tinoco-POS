import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CreditoDetalleClient } from '@/components/creditos/CreditoDetalleClient'
import { formatMXN, formatDate } from '@/lib/utils/format'

export const metadata = { title: 'Detalle crédito — POS TINOCO' }

export default async function CreditoDetallePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if ((profile as any)?.rol !== 'admin') redirect('/')

  const { data: credito } = await supabase
    .from('creditos')
    .select(`
      id, monto_original, saldo, fecha_otorgamiento, fecha_vencimiento,
      plazo_dias, tasa_mora_pct, estado, aval_nombre, lugar_expedicion, notas, created_at,
      clientes(id, nombre, rfc, telefono, email),
      tickets(id, folio, total, created_at,
        ticket_items(cantidad, precio_unitario, subtotal, productos(sku, nombre))
      ),
      profiles!creditos_otorgado_por_fkey(nombre)
    `)
    .eq('id', params.id)
    .single()

  if (!credito) notFound()

  const { data: abonos } = await supabase
    .from('abonos_credito')
    .select('id, monto, fecha, metodo_pago, referencia, notas, created_at, profiles!abonos_credito_registrado_por_fkey(nombre)')
    .eq('credito_id', params.id)
    .order('fecha', { ascending: false })

  const c = credito as any
  const abonosList = (abonos ?? []).map((a: any) => ({
    id: a.id as string,
    monto: Number(a.monto),
    fecha: a.fecha as string,
    metodo_pago: a.metodo_pago as string,
    referencia: a.referencia as string | null,
    notas: a.notas as string | null,
    registrado_por: a.profiles?.nombre as string | null,
  }))

  const ticketItems = (c.tickets?.ticket_items ?? []).map((i: any) => ({
    cantidad: Number(i.cantidad),
    precio_unitario: Number(i.precio_unitario),
    subtotal: Number(i.subtotal),
    producto_sku: i.productos?.sku ?? '—',
    producto_nombre: i.productos?.nombre ?? '—',
  }))

  const creditoData = {
    id: c.id as string,
    monto_original: Number(c.monto_original),
    saldo: Number(c.saldo),
    fecha_otorgamiento: c.fecha_otorgamiento as string,
    fecha_vencimiento: c.fecha_vencimiento as string,
    plazo_dias: Number(c.plazo_dias),
    tasa_mora_pct: Number(c.tasa_mora_pct),
    estado: c.estado as string,
    aval_nombre: c.aval_nombre as string | null,
    lugar_expedicion: c.lugar_expedicion as string,
    notas: c.notas as string | null,
    otorgado_por: c.profiles?.nombre as string | null,
    cliente: {
      id: c.clientes?.id as string,
      nombre: c.clientes?.nombre as string ?? '—',
      rfc: c.clientes?.rfc as string | null,
      telefono: c.clientes?.telefono as string | null,
      email: c.clientes?.email as string | null,
    },
    ticket: c.tickets ? {
      id: c.tickets.id as string,
      folio: c.tickets.folio as string,
      total: Number(c.tickets.total),
      created_at: c.tickets.created_at as string,
    } : null,
    ticket_items: ticketItems,
    abonos: abonosList,
  }

  return (
    <div className="max-w-4xl">
      <Link href="/admin/creditos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={14} />
        Volver a créditos
      </Link>

      <CreditoDetalleClient credito={creditoData} />
    </div>
  )
}
