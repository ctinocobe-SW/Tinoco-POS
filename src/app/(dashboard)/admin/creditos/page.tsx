import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatMXN, formatDate } from '@/lib/utils/format'
import { CreditosClientPage } from '@/components/creditos/CreditosClientPage'
import { actualizarVencidos } from '@/lib/actions/creditos'
import { TrendingDown, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react'

export const metadata = { title: 'Créditos — POS TINOCO' }

function diasDesde(fecha: string | null): number {
  if (!fecha) return 0
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
}

export default async function CreditosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if ((profile as any)?.rol !== 'admin') redirect('/')

  // Actualizar vencidos automáticamente al cargar la página
  await actualizarVencidos()

  const { data: creditos } = await supabase
    .from('creditos')
    .select(`
      id, monto_original, saldo, fecha_otorgamiento, fecha_vencimiento,
      plazo_dias, tasa_mora_pct, estado, notas, created_at,
      clientes(id, nombre, rfc),
      tickets(folio),
      abonos_credito(fecha, monto)
    `)
    .order('created_at', { ascending: false })

  const lista = (creditos ?? []).map((c: any) => {
    const abonos = (c.abonos_credito ?? []) as { fecha: string; monto: number }[]
    const ultimoAbono = abonos.length > 0
      ? abonos.sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha
      : null
    const diasSinPago = ultimoAbono
      ? diasDesde(ultimoAbono)
      : diasDesde(c.fecha_otorgamiento)
    const diasVencimiento = Math.floor(
      (new Date(c.fecha_vencimiento).getTime() - Date.now()) / 86_400_000
    )
    return {
      id: c.id as string,
      cliente_id: c.clientes?.id as string,
      cliente_nombre: c.clientes?.nombre as string ?? '—',
      cliente_rfc: c.clientes?.rfc as string | null,
      ticket_folio: c.tickets?.folio as string | null,
      monto_original: Number(c.monto_original),
      saldo: Number(c.saldo),
      fecha_otorgamiento: c.fecha_otorgamiento as string,
      fecha_vencimiento: c.fecha_vencimiento as string,
      plazo_dias: Number(c.plazo_dias),
      tasa_mora_pct: Number(c.tasa_mora_pct),
      estado: c.estado as string,
      notas: c.notas as string | null,
      dias_sin_pago: diasSinPago,
      dias_vencimiento: diasVencimiento,
      total_abonado: abonos.reduce((s, a) => s + Number(a.monto), 0),
    }
  })

  // ── KPIs ──
  const activos     = lista.filter((c) => c.estado === 'vigente' || c.estado === 'vencido')
  const vencidos    = lista.filter((c) => c.estado === 'vencido')
  const liquidados  = lista.filter((c) => c.estado === 'liquidado')

  const carteraActiva   = activos.reduce((s, c) => s + c.saldo, 0)
  const montoVencido    = vencidos.reduce((s, c) => s + c.saldo, 0)

  // Cobrado este mes
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
  const { data: abonosMes } = await supabase
    .from('abonos_credito')
    .select('monto')
    .gte('created_at', inicioMes.toISOString())
  const cobradoMes = (abonosMes ?? []).reduce((s: number, a: any) => s + Number(a.monto), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Créditos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestión de cartera y cobranza</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <TrendingDown size={14} />
            Cartera activa
          </div>
          <p className="text-2xl font-semibold">{formatMXN(carteraActiva)}</p>
          <p className="text-xs text-muted-foreground mt-1">{activos.length} crédito{activos.length !== 1 ? 's' : ''}</p>
        </div>

        <div className={`border rounded-lg p-4 ${montoVencido > 0 ? 'border-red-200 bg-red-50' : 'border-border'}`}>
          <div className={`flex items-center gap-2 text-sm mb-2 ${montoVencido > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
            <AlertTriangle size={14} />
            Cartera vencida
          </div>
          <p className={`text-2xl font-semibold ${montoVencido > 0 ? 'text-red-700' : ''}`}>{formatMXN(montoVencido)}</p>
          <p className={`text-xs mt-1 ${montoVencido > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
            {vencidos.length} crédito{vencidos.length !== 1 ? 's' : ''} vencido{vencidos.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <DollarSign size={14} />
            Cobrado este mes
          </div>
          <p className="text-2xl font-semibold">{formatMXN(cobradoMes)}</p>
          <p className="text-xs text-muted-foreground mt-1">en abonos</p>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <CheckCircle size={14} />
            Liquidados
          </div>
          <p className="text-2xl font-semibold">{liquidados.length}</p>
          <p className="text-xs text-muted-foreground mt-1">créditos saldados</p>
        </div>
      </div>

      <CreditosClientPage creditos={lista} />
    </div>
  )
}
