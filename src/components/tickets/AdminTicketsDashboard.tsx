'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Check, X, CornerDownLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { aprobarTicket } from '@/lib/actions/tickets'
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

const PROCESO_ESTADOS: TicketEstado[] = [
  'aprobado', 'verificado', 'despachado'
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
    cliente_nombre: t.clientes?.nombre ?? null,
    cliente_rfc: t.clientes?.rfc ?? null,
    despachador_nombre: t.despachador?.nombre ?? null,
    checador_nombre: t.checador?.nombre ?? null,
  }
}

// ── Panel: Aprobación ──────────────────────────────────────
function AprobacionPanel({ tickets, onRefetch }: { tickets: TicketRow[]; onRefetch: () => void }) {
  const [dialogAction, setDialogAction] = useState<{ ticketId: string; accion: 'rechazar' | 'devolver' } | null>(null)
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

  const handleDialogSubmit = () => {
    if (!dialogAction) return
    startTransition(async () => {
      const result = await aprobarTicket({
        ticket_id: dialogAction.ticketId,
        accion: dialogAction.accion,
        motivo: motivo || undefined,
      })
      if (result.error) { toast.error(result.error); return }
      toast.success(dialogAction.accion === 'rechazar' ? 'Ticket rechazado' : 'Ticket devuelto')
      setDialogAction(null)
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
              <Button size="sm" variant="outline" onClick={() => setDialogAction({ ticketId: t.id, accion: 'devolver' })}
                disabled={isPending} className="h-7 text-xs">
                <CornerDownLeft size={11} className="mr-1" />Devolver
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDialogAction({ ticketId: t.id, accion: 'rechazar' })}
                disabled={isPending} className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200">
                <X size={11} className="mr-1" />Rechazar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={!!dialogAction}
        onClose={() => { setDialogAction(null); setMotivo('') }}
        title={dialogAction?.accion === 'rechazar' ? 'Rechazar ticket' : 'Devolver ticket'}
      >
        <div className="space-y-4">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder={dialogAction?.accion === 'rechazar' ? 'Motivo del rechazo...' : 'Observaciones (opcional)...'}
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent resize-none"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setDialogAction(null); setMotivo('') }}>Cancelar</Button>
            <Button onClick={handleDialogSubmit} disabled={isPending}>
              {isPending ? 'Procesando...' : dialogAction?.accion === 'rechazar' ? 'Rechazar' : 'Devolver'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

// ── Panel: En Proceso ──────────────────────────────────────
function ProcesoPanel({ tickets }: { tickets: TicketRow[] }) {
  return (
    <div className="space-y-2">
      {tickets.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">Sin tickets en proceso</p>
      ) : tickets.map((t) => (
        <div key={t.id} className="border border-border rounded-lg p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium">{t.folio}</span>
                <TicketStatusBadge estado={t.estado} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">{t.cliente_nombre ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Desp: {t.despachador_nombre ?? '—'}</p>
            </div>
            <p className="text-sm font-semibold shrink-0">{formatMXN(t.total)}</p>
          </div>
          {t.despachado_at && (
            <p className="text-xs text-green-600">Despachado {formatDateTime(t.despachado_at)}</p>
          )}
          {t.verificado_at && !t.despachado_at && (
            <p className="text-xs text-muted-foreground">Verificado {formatDateTime(t.verificado_at)}</p>
          )}
        </div>
      ))}
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
    faltante: 'Faltante',
    sobrante: 'Sobrante',
    incorrecto: 'Incorrecto',
    danado: 'Dañado',
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
  const [tickets, setTickets] = useState<TicketRow[]>(initialTickets)
  const [createOpen, setCreateOpen] = useState(false)

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tickets')
      .select(`
        id, folio, estado, total, notas, created_at, aprobado_at, verificado_at, despachado_at,
        clientes(nombre, rfc),
        despachador:profiles!tickets_despachador_id_fkey(nombre),
        checador:profiles!tickets_checador_id_fkey(nombre)
      `)
      .in('estado', ACTIVE_ESTADOS)
      .order('created_at', { ascending: false })
      .limit(200)

    if (data) setTickets(data.map(mapRow))
  }, [])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin-tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        refetch()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [refetch])

  const pendientes = tickets.filter((t) => t.estado === 'pendiente_aprobacion')
  const enProceso = tickets.filter((t) => PROCESO_ESTADOS.includes(t.estado))
  const checando = tickets.filter((t) => ['en_verificacion', 'con_incidencias'].includes(t.estado))

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} · {enProceso.length} en proceso · {checando.length} en verificación
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={15} className="mr-1.5" />
          Crear ticket
        </Button>
      </div>

      {/* 3 columnas */}
      <div className="grid grid-cols-3 gap-5">
        {/* Col 1: Aprobación */}
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

        {/* Col 2: En Proceso */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">En Proceso</h2>
            {enProceso.length > 0 && (
              <span className="bg-brand-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {enProceso.length}
              </span>
            )}
          </div>
          <ProcesoPanel tickets={enProceso} />
        </div>

        {/* Col 3: Checador */}
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

      <AdminCreateTicketDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); refetch() }}
        despachadores={despachadores}
        almacenes={almacenes}
      />
    </>
  )
}
