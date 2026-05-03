'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Check, ExternalLink, DollarSign, Trash2, Truck, RotateCcw, Timer } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { aprobarTicket, cancelarTicket, toggleCobroPendiente, entregarTicket, volverAChecar } from '@/lib/actions/tickets'
import { formatMXN, formatDateTime } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { TicketStatusBadge } from './TicketStatusBadge'
import { AdminCreateTicketDialog } from './AdminCreateTicketDialog'
import type { TicketEstado } from '@/types/database.types'

interface TicketRow {
  id: string
  folio: string
  estado: TicketEstado
  total: number
  notas: string | null
  created_at: string
  aprobado_at: string | null
  verificado_at: string | null
  despachado_at: string | null
  cobro_pendiente: boolean
  cliente_nombre: string | null
  cliente_rfc: string | null
  despachador_nombre: string | null
  checador_nombre: string | null
}

interface TicketItem {
  id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  verificado: boolean
  discrepancia_tipo: string | null
  discrepancia_nota: string | null
  producto_sku: string
  producto_nombre: string
}

interface Perfil { id: string; nombre: string; rol: string }
interface Almacen { id: string; nombre: string }

interface AdminTicketsDashboardProps {
  tickets: TicketRow[]
  despachadores: Perfil[]
  almacenes: Almacen[]
}

const ACTIVE_ESTADOS: TicketEstado[] = [
  'pendiente_aprobacion', 'aprobado', 'en_verificacion', 'verificado', 'con_incidencias', 'despachado'
]

// En Proceso: todo lo activo excepto pendiente_aprobacion y despachado
const PROCESO_ESTADOS: TicketEstado[] = [
  'aprobado', 'en_verificacion', 'verificado', 'con_incidencias'
]

function mapRow(t: any): TicketRow {
  return {
    id: t.id,
    folio: t.folio,
    estado: t.estado,
    total: Number(t.total),
    notas: t.notas ?? null,
    created_at: t.created_at,
    aprobado_at: t.aprobado_at ?? null,
    verificado_at: t.verificado_at ?? null,
    despachado_at: t.despachado_at ?? null,
    cobro_pendiente: t.cobro_pendiente ?? false,
    cliente_nombre: t.clientes?.nombre ?? null,
    cliente_rfc: t.clientes?.rfc ?? null,
    despachador_nombre: t.despachador?.nombre ?? null,
    checador_nombre: t.checador?.nombre ?? null,
  }
}

// ── Cronómetro ────────────────────────────────────────────
function TicketTimer({ aprobadoAt }: { aprobadoAt: string | null }) {
  const [segundos, setSegundos] = useState(0)

  useEffect(() => {
    if (!aprobadoAt) return
    const inicio = new Date(aprobadoAt).getTime()
    const tick = () => setSegundos(Math.floor((Date.now() - inicio) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [aprobadoAt])

  if (!aprobadoAt) return null

  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const color = segundos < 600
    ? 'text-green-600'
    : segundos < 1200
    ? 'text-amber-600'
    : 'text-red-600'

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-semibold ${color}`}>
      <Timer size={11} />
      {display}
    </span>
  )
}

// ── Panel: Aprobación ──────────────────────────────────────
function AprobacionPanel({ tickets, onRefetch }: { tickets: TicketRow[]; onRefetch: () => void }) {
  const [cancelTicketId, setCancelTicketId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleAprobar = (ticketId: string) => {
    startTransition(async () => {
      const result = await aprobarTicket({ ticket_id: ticketId, accion: 'aprobar' })
      if (result.error) { toast.error(result.error); return }
      toast.success('Ticket aprobado')
      onRefetch()
    })
  }

  const handleCancelar = () => {
    if (!cancelTicketId) return
    startTransition(async () => {
      const result = await aprobarTicket({
        ticket_id: cancelTicketId,
        accion: 'rechazar',
        motivo: motivo || undefined,
      })
      if (result.error) { toast.error(result.error); return }
      toast.success('Ticket cancelado')
      setCancelTicketId(null)
      setMotivo('')
      onRefetch()
    })
  }

  return (
    <>
      <div className="space-y-2">
        {tickets.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">Sin pendientes</p>
        ) : tickets.map((t) => (
          <div key={t.id} className="border border-amber-200 bg-amber-50/30 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium">{t.folio}</span>
                  <Link href={`/admin/tickets/${t.id}`} className="text-muted-foreground hover:text-foreground">
                    <ExternalLink size={11} />
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.cliente_nombre ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Desp: {t.despachador_nombre ?? '—'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{formatMXN(t.total)}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}</p>
              </div>
            </div>
            {t.notas && <p className="text-xs text-muted-foreground italic mb-2">"{t.notas}"</p>}
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => handleAprobar(t.id)} disabled={isPending} className="h-7 text-xs">
                <Check size={11} className="mr-1" />Aprobar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCancelTicketId(t.id)}
                disabled={isPending} className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200">
                <Trash2 size={11} className="mr-1" />Cancelar ticket
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={!!cancelTicketId}
        onClose={() => { setCancelTicketId(null); setMotivo('') }}
        title="Cancelar ticket"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">El ticket quedará marcado como cancelado y no podrá procesarse.</p>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Motivo de cancelación (opcional)..."
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent resize-none"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setCancelTicketId(null); setMotivo('') }}>Volver</Button>
            <Button onClick={handleCancelar} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? 'Cancelando...' : 'Cancelar ticket'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

// ── Panel: En Proceso ──────────────────────────────────────
function ProcesoPanel({ tickets, onRefetch }: { tickets: TicketRow[]; onRefetch: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [cancelDialog, setCancelDialog] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [deliverDialog, setDeliverDialog] = useState<{ id: string; aprobadoAt: string | null } | null>(null)

  const handleEntregar = (cobroPendiente: boolean) => {
    if (!deliverDialog) return
    const { id, aprobadoAt } = deliverDialog
    const segundos = aprobadoAt
      ? Math.floor((Date.now() - new Date(aprobadoAt).getTime()) / 1000)
      : undefined
    startTransition(async () => {
      const result = await entregarTicket(id, segundos, cobroPendiente)
      if (result.error) { toast.error(result.error); return }
      toast.success(cobroPendiente ? 'Pedido entregado · pendiente de cobro' : 'Pedido entregado y cobrado')
      setDeliverDialog(null)
      onRefetch()
    })
  }

  const handleVolverAChecar = (ticketId: string) => {
    startTransition(async () => {
      const result = await volverAChecar(ticketId)
      if (result.error) { toast.error(result.error); return }
      toast.success('Ticket enviado de nuevo al checador')
      onRefetch()
    })
  }

  const handleCancelar = () => {
    if (!cancelDialog) return
    startTransition(async () => {
      const result = await cancelarTicket(cancelDialog, motivo || undefined)
      if (result.error) { toast.error(result.error); return }
      toast.success('Ticket cancelado')
      setCancelDialog(null)
      setMotivo('')
      onRefetch()
    })
  }

  const puedeEntregar = (estado: TicketEstado) =>
    ['verificado', 'con_incidencias'].includes(estado)

  const puedeVolverAChecar = (estado: TicketEstado) =>
    ['verificado', 'con_incidencias'].includes(estado)

  return (
    <>
      <div className="space-y-2">
        {tickets.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">Sin tickets en proceso</p>
        ) : tickets.map((t) => (
          <div key={t.id} className={`border rounded-lg p-3 ${t.cobro_pendiente ? 'border-orange-300 bg-orange-50/30' : 'border-border'}`}>
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-medium">{t.folio}</span>
                  <Link href={`/admin/tickets/${t.id}`} className="text-muted-foreground hover:text-foreground">
                    <ExternalLink size={11} />
                  </Link>
                  <TicketStatusBadge estado={t.estado} />
                  {t.cobro_pendiente && (
                    <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded px-1 py-0.5 font-medium">
                      Por cobrar
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">{t.cliente_nombre ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Desp: {t.despachador_nombre ?? '—'}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <p className="text-sm font-semibold">{formatMXN(t.total)}</p>
                <TicketTimer aprobadoAt={t.aprobado_at} />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {puedeEntregar(t.estado) && (
                <button
                  type="button"
                  onClick={() => setDeliverDialog({ id: t.id, aprobadoAt: t.aprobado_at })}
                  disabled={isPending}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-green-700 border border-green-300 hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  <Truck size={11} />
                  Entregar
                </button>
              )}
              {puedeVolverAChecar(t.estado) && (
                <button
                  type="button"
                  onClick={() => handleVolverAChecar(t.id)}
                  disabled={isPending}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-700 border border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={11} />
                  Volver a checar
                </button>
              )}
              <button
                type="button"
                onClick={() => setCancelDialog(t.id)}
                disabled={isPending}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 size={11} />
                Cancelar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={!!cancelDialog}
        onClose={() => { setCancelDialog(null); setMotivo('') }}
        title="Cancelar ticket"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer. El ticket quedará marcado como cancelado.</p>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Motivo de cancelación (opcional)..."
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent resize-none"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setCancelDialog(null); setMotivo('') }}>Volver</Button>
            <Button onClick={handleCancelar} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? 'Cancelando...' : 'Cancelar ticket'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deliverDialog}
        onClose={() => setDeliverDialog(null)}
        title="Entregar mercancía"
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium">¿El cliente ya pagó este ticket?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Si aún no paga, lo marcaremos como pendiente de cobro y aparecerá en la sección "Por cobrar".
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => handleEntregar(true)}
              disabled={isPending}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              No, cobrar después
            </Button>
            <Button
              onClick={() => handleEntregar(false)}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPending ? 'Guardando...' : 'Sí, ya pagó'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

// ── Panel: Por Cobrar ──────────────────────────────────────
function PorCobrarPanel({ tickets, onRefetch }: { tickets: TicketRow[]; onRefetch: () => void }) {
  const [pending, startTransition] = useTransition()

  const handleCobrado = (ticketId: string) => {
    startTransition(async () => {
      const result = await toggleCobroPendiente(ticketId, false)
      if (result.error) { toast.error(result.error); return }
      toast.success('Cobro registrado ✓')
      onRefetch()
    })
  }

  if (tickets.length === 0) return null

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={14} className="text-orange-600" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-orange-700">Por Cobrar</h2>
        <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
          {tickets.length}
        </span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {formatMXN(tickets.reduce((s, t) => s + t.total, 0))} total
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-orange-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-orange-50 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-3 py-2 text-left">Folio</th>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Despachador</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Despachado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-orange-100">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-medium">{t.folio}</span>
                    <Link href={`/admin/tickets/${t.id}`} className="text-muted-foreground hover:text-foreground">
                      <ExternalLink size={10} />
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{t.cliente_nombre ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{t.despachador_nombre ?? '—'}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{formatMXN(t.total)}</td>
                <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                  {t.despachado_at ? formatDateTime(t.despachado_at) : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleCobrado(t.id)}
                    disabled={pending}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white rounded px-2 py-1 transition-colors disabled:opacity-50"
                  >
                    <Check size={11} className="inline mr-1" />Cobrado
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Panel: Checador ────────────────────────────────────────
function CheckadorPanel({ tickets }: { tickets: TicketRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [items, setItems] = useState<Map<string, TicketItem[]>>(new Map())
  const [loading, setLoading] = useState<string | null>(null)

  const loadItems = async (ticketId: string) => {
    if (items.has(ticketId)) { setExpanded(ticketId); return }
    setLoading(ticketId)
    const supabase = createClient()
    const { data } = await supabase
      .from('ticket_items')
      .select('id, cantidad, precio_unitario, subtotal, verificado, discrepancia_tipo, discrepancia_nota, productos(sku, nombre)')
      .eq('ticket_id', ticketId)
    const mapped = (data ?? []).map((i: any) => ({
      id: i.id,
      cantidad: Number(i.cantidad),
      precio_unitario: Number(i.precio_unitario),
      subtotal: Number(i.subtotal),
      verificado: i.verificado,
      discrepancia_tipo: i.discrepancia_tipo,
      discrepancia_nota: i.discrepancia_nota,
      producto_sku: i.productos?.sku ?? '',
      producto_nombre: i.productos?.nombre ?? '',
    }))
    setItems((prev) => new Map(prev).set(ticketId, mapped))
    setExpanded(ticketId)
    setLoading(null)
  }

  const DISCREPANCIA_LABELS: Record<string, string> = {
    faltante: 'Faltante', sobrante: 'Sobrante', incorrecto: 'Incorrecto', danado: 'Dañado',
  }

  return (
    <div className="space-y-2">
      {tickets.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">Sin tickets en verificación</p>
      ) : tickets.map((t) => {
        const isExpanded = expanded === t.id
        const ticketItems = items.get(t.id) ?? []
        const incidencias = ticketItems.filter((i) => i.discrepancia_tipo)

        return (
          <div key={t.id} className={`border rounded-lg overflow-hidden ${t.estado === 'con_incidencias' ? 'border-red-200' : 'border-blue-200'}`}>
            <button
              type="button"
              onClick={() => isExpanded ? setExpanded(null) : loadItems(t.id)}
              className="w-full text-left p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">{t.folio}</span>
                    <TicketStatusBadge estado={t.estado} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{t.cliente_nombre ?? '—'}</p>
                  {t.checador_nombre && (
                    <p className="text-xs text-muted-foreground">Checador: {t.checador_nombre}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatMXN(t.total)}</p>
                  <p className="text-xs text-muted-foreground">{loading === t.id ? 'Cargando...' : isExpanded ? 'Cerrar ▲' : 'Ver items ▼'}</p>
                </div>
              </div>
            </button>

            {isExpanded && ticketItems.length > 0 && (
              <div className="border-t border-border">
                {incidencias.length > 0 && (
                  <div className="px-3 py-2 bg-red-50 border-b border-red-100">
                    <p className="text-xs font-medium text-red-700 mb-1">Observaciones ({incidencias.length})</p>
                    {incidencias.map((i) => (
                      <div key={i.id} className="text-xs text-red-600 mb-0.5">
                        <span className="font-medium">{i.producto_nombre}</span>
                        {' — '}{DISCREPANCIA_LABELS[i.discrepancia_tipo!] ?? i.discrepancia_tipo}
                        {i.discrepancia_nota && <span className="text-muted-foreground">: {i.discrepancia_nota}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <table className="w-full text-xs">
                  <tbody>
                    {ticketItems.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-1.5">
                          <span className={item.verificado ? 'text-green-700' : item.discrepancia_tipo ? 'text-red-600' : 'text-muted-foreground'}>
                            {item.verificado ? '✓' : item.discrepancia_tipo ? '⚠' : '○'}
                          </span>
                          <span className="ml-2">{item.producto_nombre}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">{item.cantidad}</td>
                        <td className="px-3 py-1.5 text-right">{formatMXN(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Dashboard principal ────────────────────────────────────
export function AdminTicketsDashboard({ tickets: initialTickets, despachadores, almacenes }: AdminTicketsDashboardProps) {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketRow[]>(initialTickets)
  const [createOpen, setCreateOpen] = useState(false)

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tickets')
      .select(`
        id, folio, estado, total, notas, created_at, aprobado_at, verificado_at, despachado_at, cobro_pendiente,
        clientes(nombre, rfc),
        despachador:profiles!tickets_despachador_fk(nombre),
        checador:profiles!tickets_checador_fk(nombre)
      `)
      .in('estado', ACTIVE_ESTADOS)
      .order('created_at', { ascending: false })
      .limit(200)

    if (data) setTickets(data.map(mapRow))
    router.refresh()
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin-tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => { refetch() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch])

  useEffect(() => {
    const interval = setInterval(refetch, 15000)
    return () => clearInterval(interval)
  }, [refetch])

  const pendientes = tickets.filter((t) => t.estado === 'pendiente_aprobacion')
  const enProceso  = tickets.filter((t) => PROCESO_ESTADOS.includes(t.estado))
  const checando   = tickets.filter((t) => ['en_verificacion', 'con_incidencias'].includes(t.estado))
  const porCobrar  = tickets.filter((t) => t.cobro_pendiente && t.estado === 'despachado')

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} · {enProceso.length} en proceso · {checando.length} en verificación{porCobrar.length > 0 ? ` · ${porCobrar.length} por cobrar` : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={15} className="mr-1.5" />
          Crear ticket
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aprobación</h2>
            {pendientes.length > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {pendientes.length}
              </span>
            )}
          </div>
          <AprobacionPanel tickets={pendientes} onRefetch={refetch} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">En Proceso</h2>
            {enProceso.length > 0 && (
              <span className="bg-brand-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {enProceso.length}
              </span>
            )}
          </div>
          <ProcesoPanel tickets={enProceso} onRefetch={refetch} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checador</h2>
            {checando.length > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {checando.length}
              </span>
            )}
          </div>
          <CheckadorPanel tickets={checando} />
        </div>
      </div>

      <PorCobrarPanel tickets={porCobrar} onRefetch={refetch} />

      <AdminCreateTicketDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); refetch() }}
        despachadores={despachadores}
        almacenes={almacenes}
      />
    </>
  )
}
