'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { WifiOff } from 'lucide-react'
import { offlineDB } from '@/lib/offline/db'
import { formatMXN } from '@/lib/utils/format'

export function OfflineTicketsList() {
  const offlineTickets = useLiveQuery(
    () => offlineDB.tickets.filter((t) => !t.sincronizado).toArray(),
    [],
    []
  )

  if (!offlineTickets || offlineTickets.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-1.5">
        <WifiOff size={14} />
        Pendientes de sincronización ({offlineTickets.length})
      </h2>
      <div className="space-y-2">
        {offlineTickets.map((t) => {
          const totalLocal = t.items.reduce(
            (sum, i) => sum + i.precio_unitario * i.cantidad,
            0
          )
          return (
            <div
              key={t.id}
              className="border border-yellow-200 bg-yellow-50 rounded-lg px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-yellow-700">{t.folio_local}</span>
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                  Sin conexión
                </span>
              </div>
              <div className="mt-1 font-medium">{t.cliente_nombre || '—'}</div>
              <div className="flex items-center justify-between mt-0.5 text-muted-foreground">
                <span>{t.items.length} producto{t.items.length !== 1 ? 's' : ''}</span>
                <span className="font-medium text-foreground">{formatMXN(totalLocal)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
