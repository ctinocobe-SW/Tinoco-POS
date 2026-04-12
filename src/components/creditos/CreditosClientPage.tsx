'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NuevoCreditoDialog } from './NuevoCreditoDialog'
import { formatMXN, formatDate } from '@/lib/utils/format'

type CreditoRow = {
  id: string
  cliente_nombre: string
  cliente_rfc: string | null
  ticket_folio: string | null
  monto_original: number
  saldo: number
  fecha_vencimiento: string
  estado: string
  dias_sin_pago: number
  dias_vencimiento: number
  total_abonado: number
}

type Tab = 'todos' | 'vigente' | 'vencido' | 'liquidado' | 'cancelado'

const ESTADO_BADGE: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  vigente:   'warning',
  vencido:   'error',
  liquidado: 'success',
  cancelado: 'default',
}

const ESTADO_LABEL: Record<string, string> = {
  vigente:   'Vigente',
  vencido:   'Vencido',
  liquidado: 'Liquidado',
  cancelado: 'Cancelado',
}

function diasSinPagoClass(dias: number, estado: string) {
  if (estado === 'liquidado' || estado === 'cancelado') return 'text-muted-foreground'
  if (dias > 30) return 'text-red-600 font-semibold'
  if (dias > 15) return 'text-amber-600 font-medium'
  return 'text-muted-foreground'
}

function diasVencClass(dias: number, estado: string) {
  if (estado === 'liquidado' || estado === 'cancelado') return 'text-muted-foreground'
  if (dias < 0) return 'text-red-600 font-semibold'   // ya venció
  if (dias <= 7) return 'text-amber-600 font-medium'  // próximo a vencer
  return 'text-muted-foreground'
}

interface Props {
  creditos: CreditoRow[]
}

export function CreditosClientPage({ creditos }: Props) {
  const [tab, setTab]         = useState<Tab>('todos')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtrados = tab === 'todos' ? creditos : creditos.filter((c) => c.estado === tab)

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'todos',     label: 'Todos',     count: creditos.length },
    { key: 'vigente',   label: 'Vigentes',  count: creditos.filter((c) => c.estado === 'vigente').length },
    { key: 'vencido',   label: 'Vencidos',  count: creditos.filter((c) => c.estado === 'vencido').length },
    { key: 'liquidado', label: 'Liquidados',count: creditos.filter((c) => c.estado === 'liquidado').length },
    { key: 'cancelado', label: 'Cancelados',count: creditos.filter((c) => c.estado === 'cancelado').length },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        {/* Tabs */}
        <div className="border-b border-border flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === t.key
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                  tab === t.key ? 'bg-brand-accent/10' : 'bg-brand-muted/40'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={15} className="mr-1.5" />
          Nuevo crédito
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-border rounded-lg">
          <p className="text-sm">Sin créditos en esta categoría</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-brand-surface text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Cliente</th>
                <th className="px-4 py-2.5 text-right w-32">Monto orig.</th>
                <th className="px-4 py-2.5 text-right w-32">Saldo</th>
                <th className="px-4 py-2.5 text-center w-28">Sin pago</th>
                <th className="px-4 py-2.5 text-center w-28">Vencimiento</th>
                <th className="px-4 py-2.5 text-center w-28">Estado</th>
                <th className="px-4 py-2.5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-brand-surface/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.cliente_nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.cliente_rfc && (
                        <span className="text-xs text-muted-foreground font-mono">{c.cliente_rfc}</span>
                      )}
                      {c.ticket_folio && (
                        <span className="text-xs text-muted-foreground">· Ticket {c.ticket_folio}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatMXN(c.monto_original)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {c.estado === 'liquidado' ? (
                      <span className="text-green-600">{formatMXN(0)}</span>
                    ) : (
                      <span className={c.estado === 'vencido' ? 'text-red-600' : ''}>
                        {formatMXN(c.saldo)}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-center text-xs ${diasSinPagoClass(c.dias_sin_pago, c.estado)}`}>
                    {c.estado === 'liquidado' || c.estado === 'cancelado'
                      ? '—'
                      : `${c.dias_sin_pago}d`}
                  </td>
                  <td className={`px-4 py-3 text-center text-xs ${diasVencClass(c.dias_vencimiento, c.estado)}`}>
                    {c.estado === 'liquidado' || c.estado === 'cancelado'
                      ? formatDate(c.fecha_vencimiento)
                      : c.dias_vencimiento < 0
                        ? `Vencido hace ${Math.abs(c.dias_vencimiento)}d`
                        : c.dias_vencimiento === 0
                          ? 'Hoy'
                          : `${c.dias_vencimiento}d`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={ESTADO_BADGE[c.estado] ?? 'default'}>
                      {ESTADO_LABEL[c.estado] ?? c.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/creditos/${c.id}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <NuevoCreditoDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
